"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { formatZodError } from "@/lib/zod-el";
import { computeLine, computeDocument } from "@/lib/totals";
import {
  NotImplementedInPhase1,
  WrappApiError,
  getWrappClient,
  mapDocumentTypeToWrapp,
  mapPaymentMethodToWrapp,
  classificationFor,
} from "@/lib/wrapp/client";
import { translateWrappError } from "@/lib/wrapp/errors-el";
import { reserveNextNumber } from "@/lib/numbering";
import { logger } from "@/lib/logger";
import {
  ensureDefaultBillingBook,
  ensureWrappBillingBookSynced,
} from "@/lib/billing-books";
import { sendEmail } from "@/lib/email/send";
import { documentToClientTemplate } from "@/lib/email/templates";
import { t } from "@/lib/i18n";
import { todayInAthens } from "@/lib/date";
import { isStagingMode } from "@/lib/runtime-mode";
import type { DocumentType } from "@prisma/client";

// Greek cash-payment threshold (Ν. 4172/2013 άρθρο 23 παρ. 4 + Ν.
// 4446/2016). Transactions above 500€ paid in cash are non-deductible
// and expose the tenant to fines. Enforced on save AND issue so a
// devtools bypass of the client-side modal can't succeed.
const CASH_LIMIT_EUR = 500;
const CASH_PAYMENT_KEYWORDS = [
  "μετρητά",
  "μετρητοίς",
  "cash",
];

function isCashPayment(method: string | null | undefined): boolean {
  if (!method) return false;
  const lower = method.trim().toLowerCase();
  return CASH_PAYMENT_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Returns an error message if the (paymentMethod, total) combo violates
 * the Greek cash-payment ceiling. null when compliant.
 */
function cashLimitViolation(
  paymentMethod: string | null | undefined,
  total: number,
): string | null {
  if (!isCashPayment(paymentMethod)) return null;
  if (total <= CASH_LIMIT_EUR) return null;
  const nf = new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  });
  return (
    `Δεν επιτρέπονται μετρητά άνω των ${CASH_LIMIT_EUR}€ ` +
    `(σύνολο ${nf.format(total)}). ` +
    `Άλλαξε τρόπο πληρωμής (κάρτα, τραπεζική μεταφορά, POS ή IRIS) ή ` +
    `σπάσε τη συναλλαγή σε παραστατικά κάτω των ${CASH_LIMIT_EUR}€. ` +
    `Ν. 4172/2013 άρθρο 23 παρ. 4.`
  );
}

/**
 * Duplicate document detection. Returns matching drafts/issued docs
 * for the same (business, client, type, total, day) within a 5-minute
 * window — a strong signal the user double-clicked "Save" or forgot
 * they already created this one. Called from create/update actions;
 * the client sees a warning modal with a "confirm anyway" button
 * since some duplicates are intentional (correction, re-issue).
 */
// Credit-note-like types: multiple credits against the same parent on the
// same day for the same total are LEGITIMATE (partial credits, correction
// re-issues). Flagging these as duplicates trained users to ignore the
// warning modal — worse than not warning at all. Skip dup detection
// entirely for these types.
const CREDIT_NOTE_LIKE_TYPES: ReadonlySet<DocumentType> = new Set([
  "credit_note",
  "credit_note_correlated",
  "retail_credit_note",
  "retail_refund_receipt",
] as const);

async function findLikelyDuplicates(input: {
  businessId: string;
  clientId: string | null;
  type: DocumentType;
  total: number;
  issueDate: Date;
  excludeId?: string;
}): Promise<
  Array<{ id: string; series: string | null; number: number | null; status: string; createdAt: Date }>
> {
  if (CREDIT_NOTE_LIKE_TYPES.has(input.type)) return [];
  const dayStart = new Date(input.issueDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(input.issueDate);
  dayEnd.setHours(23, 59, 59, 999);

  // Money comparison via a narrow tolerance (± 0.005€) so
  // Decimal(14,2) rows still match when the client sent Number(x).
  const totalMin = input.total - 0.005;
  const totalMax = input.total + 0.005;

  const rows = await prisma.document.findMany({
    where: {
      businessId: input.businessId,
      type: input.type,
      status: { in: ["draft", "sending", "issued"] },
      clientId: input.clientId ?? undefined,
      totalAmount: { gte: totalMin, lte: totalMax },
      issueDate: { gte: dayStart, lte: dayEnd },
      ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
    },
    select: {
      id: true,
      series: true,
      number: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  return rows;
}

const DOCUMENT_TYPES = [
  "invoice",
  "service_invoice",
  "retail_receipt",
  "service_receipt",
  "simplified_invoice",
  "eu_sale_invoice",
  "third_country_sale_invoice",
  "eu_service_invoice",
  "third_country_service_invoice",
  "credit_note",
  "credit_note_correlated",
  "delivery_note",
  "stay_tax_receipt",
  "third_party_sale_invoice",
  "third_party_sale_clearing",
  "complementary_invoice",
  "complementary_service_invoice",
  "purchase_title",
  "purchase_title_refused",
  "self_delivery",
  "self_use",
  "contract_income",
  "rental_income",
  "retail_refund_receipt",
  "pos_income_receipt",
  "pos_payment_receipt",
  "retail_credit_note",
  "third_party_retail_receipt",
  "delivery_note_correlated",
  "quantitative_receipt",
  "income_settlement_accounting",
  "income_settlement_tax",
  "expense_settlement_accounting",
  "expense_settlement_tax",
  "payroll_entry",
  "depreciation",
  "proforma",
  "quote",
  "order",
] as const;

// Types that need currency + exchange rate in the Wrapp payload.
const FOREIGN_TYPES: readonly (typeof DOCUMENT_TYPES)[number][] = [
  "eu_sale_invoice",
  "third_country_sale_invoice",
  "eu_service_invoice",
  "third_country_service_invoice",
];

// Types that use the correlated-doc reference (parent MARK).
const CORRELATED_TYPES: readonly (typeof DOCUMENT_TYPES)[number][] = [
  "credit_note_correlated",
  "stay_tax_receipt",
  "complementary_invoice",
  "complementary_service_invoice",
  "retail_refund_receipt",
  "retail_credit_note",
  "delivery_note_correlated",
];

/**
 * Lazy billing-book creation for the type the editor is switching to.
 * Returns the freshly-visible list of books so the client can update its
 * dropdown without a full page reload.
 */
export async function ensureBillingBookForTypeAction(
  documentType: DocumentType,
): Promise<
  | {
      ok: true;
      books: {
        id: string;
        series: string;
        label: string | null;
        documentType: DocumentType;
        branchId: string | null;
        isDefault: boolean;
        nextNumber: number;
      }[];
    }
  | { ok: false; error: string }
> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");
  await ensureDefaultBillingBook(ctx.businessId, documentType);
  const books = await prisma.billingBook.findMany({
    where: { businessId: ctx.businessId },
    orderBy: [
      { documentType: "asc" },
      { isDefault: "desc" },
      { series: "asc" },
    ],
    select: {
      id: true,
      series: true,
      label: true,
      documentType: true,
      branchId: true,
      isDefault: true,
      nextNumber: true,
    },
  });
  return { ok: true, books };
}

const lineSchema = z.object({
  itemId: z.string().optional().or(z.literal("")),
  description: z.string().min(1).max(255),
  // Credit-note drafts store negative quantities so the local ledger balances
  // against the parent invoice. The wire-time Math.abs() in attemptIssueAction
  // handles the provider's positives-only rule, so validation just needs to
  // reject zero (a zero-quantity line has no meaning either way).
  quantity: z.coerce.number().refine((n) => n !== 0, {
    message: "Η ποσότητα δεν μπορεί να είναι 0",
  }),
  unit: z.string().max(20).default("τμχ"),
  unitPrice: z.coerce.number().min(0),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  vatRate: z.coerce.number().min(0).max(100).default(24),
});

const draftSchema = z.object({
  type: z.enum(DOCUMENT_TYPES),
  clientId: z.string().optional().or(z.literal("")),
  branchId: z.string().optional().or(z.literal("")),
  billingBookId: z.string().optional().or(z.literal("")),
  series: z.string().max(20).optional().or(z.literal("")),
  issueDate: z.string().min(1),
  deliveryNoteRef: z.string().max(120).optional().or(z.literal("")),
  paymentMethod: z.string().max(80).optional().or(z.literal("")),
  printLanguage: z.enum(["el", "en"]).default("el"),
  additionalTaxes: z.string().max(5000).optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
  lines: z.array(lineSchema).min(1, "Πρόσθεσε τουλάχιστον μία γραμμή."),
  // Delivery-note (9.3) extras — collected as Πληροφορίες Διακίνησης.
  dispatchAt: z.string().optional().or(z.literal("")),
  dispatchReason: z.string().max(200).optional().or(z.literal("")),
  dispatchPurpose: z.string().max(200).optional().or(z.literal("")),
  loadingAddress: z.string().max(400).optional().or(z.literal("")),
  destinationAddress: z.string().max(400).optional().or(z.literal("")),
  vehicleNumber: z.string().max(40).optional().or(z.literal("")),
  driverName: z.string().max(160).optional().or(z.literal("")),
  // Correlated credit-note (5.1) + stay-tax (8.2) fields — server nulls
  // them out on any other type. Reuse of the same two columns keeps the
  // Document schema slim; the picker in the UI handles both cases.
  correlatedDocumentId: z.string().optional().or(z.literal("")),
  correlatedMarkOverride: z.string().max(80).optional().or(z.literal("")),
  // Foreign-transaction fields — populated on EU/third-country invoices.
  currency: z.string().max(3).optional().or(z.literal("")),
  exchangeRate: z.coerce.number().min(0).optional(),
  // Stay-tax (8.2) fields.
  stayTaxCategory: z.string().max(60).optional().or(z.literal("")),
  stayTaxAmount: z.coerce.number().min(0).optional(),
});

export type DraftFormState = { error?: string } | undefined;

export type DraftInput = z.infer<typeof draftSchema>;

export type DraftActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string }
  | {
      ok: false;
      kind: "duplicate";
      matches: Array<{
        id: string;
        series: string | null;
        number: number | null;
        status: string;
        createdAt: string;
      }>;
    };

export async function createDraftAction(
  input: DraftInput,
  options?: { confirmDuplicate?: boolean },
): Promise<DraftActionResult> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");

  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: formatZodError(parsed.error) };
  }

  const totals = computeDocument(parsed.data.lines);

  const cashError = cashLimitViolation(
    parsed.data.paymentMethod,
    Number(totals.total),
  );
  if (cashError) return { ok: false, error: cashError };

  // Duplicate check — same client + same total + same day + same type
  // within a 5-min window. Skipped when the user has explicitly
  // acknowledged the warning via the modal.
  if (!options?.confirmDuplicate) {
    const matches = await findLikelyDuplicates({
      businessId: ctx.businessId,
      clientId: parsed.data.clientId || null,
      type: parsed.data.type,
      total: Number(totals.total),
      issueDate: new Date(parsed.data.issueDate),
    });
    if (matches.length > 0) {
      return {
        ok: false,
        kind: "duplicate",
        matches: matches.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
        })),
      };
    }
  }

  // Capture the runtime mode ONCE up front so every doc created in
  // this action inherits the same flag — a mid-transaction cookie
  // change won't cause half the row to be tagged staging.
  const staging = await isStagingMode();

  const doc = await prisma.$transaction(async (tx) => {
    // If a billing book is chosen, prefer its series over any free-typed value.
    let series = parsed.data.series || null;
    let billingBookId: string | null = null;
    if (parsed.data.billingBookId) {
      const book = await tx.billingBook.findFirst({
        where: {
          id: parsed.data.billingBookId,
          businessId: ctx.businessId,
        },
        select: { id: true, series: true },
      });
      if (book) {
        billingBookId = book.id;
        series = book.series;
      }
    }

    const d = await tx.document.create({
      data: {
        businessId: ctx.businessId,
        clientId: parsed.data.clientId || null,
        branchId: parsed.data.branchId || null,
        billingBookId,
        stagingMode: staging,
        type: parsed.data.type,
        status: "draft",
        series,
        issueDate: new Date(parsed.data.issueDate),
        deliveryNoteRef: parsed.data.deliveryNoteRef || null,
        paymentMethod: parsed.data.paymentMethod || null,
        printLanguage: parsed.data.printLanguage,
        additionalTaxes: parsed.data.additionalTaxes || null,
        notes: parsed.data.notes || null,
        dispatchAt: parsed.data.dispatchAt
          ? new Date(parsed.data.dispatchAt)
          : null,
        dispatchReason: parsed.data.dispatchReason || null,
        dispatchPurpose: parsed.data.dispatchPurpose || null,
        loadingAddress: parsed.data.loadingAddress || null,
        destinationAddress: parsed.data.destinationAddress || null,
        vehicleNumber: parsed.data.vehicleNumber || null,
        driverName: parsed.data.driverName || null,
        correlatedDocumentId: CORRELATED_TYPES.includes(parsed.data.type)
          ? parsed.data.correlatedDocumentId || null
          : null,
        correlatedMarkOverride: CORRELATED_TYPES.includes(parsed.data.type)
          ? parsed.data.correlatedMarkOverride || null
          : null,
        currency:
          parsed.data.type === "eu_sale_invoice" ||
          parsed.data.type === "third_country_sale_invoice" ||
          parsed.data.type === "eu_service_invoice" ||
          parsed.data.type === "third_country_service_invoice"
            ? parsed.data.currency || null
            : null,
        exchangeRate:
          parsed.data.type === "eu_sale_invoice" ||
          parsed.data.type === "third_country_sale_invoice" ||
          parsed.data.type === "eu_service_invoice" ||
          parsed.data.type === "third_country_service_invoice"
            ? parsed.data.exchangeRate ?? null
            : null,
        stayTaxCategory:
          parsed.data.type === "stay_tax_receipt"
            ? parsed.data.stayTaxCategory || null
            : null,
        stayTaxAmount:
          parsed.data.type === "stay_tax_receipt"
            ? parsed.data.stayTaxAmount ?? null
            : null,
        netTotalAmount: totals.netTotal,
        vatTotalAmount: totals.vatTotal,
        totalAmount: totals.total,
        payableTotalAmount: totals.total,
      },
    });

    await tx.documentLine.createMany({
      data: parsed.data.lines.map((line, i) => {
        const t = computeLine(line);
        return {
          documentId: d.id,
          itemId: line.itemId || null,
          ordinal: i,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit || "τμχ",
          unitPrice: line.unitPrice,
          discountPct: line.discountPct,
          vatRate: line.vatRate,
          netAmount: t.net,
          vatAmount: t.vat,
          totalAmount: t.total,
        };
      }),
    });

    return d;
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "document.draft.create",
    entityType: "Document",
    entityId: doc.id,
    meta: { type: parsed.data.type },
  });

  revalidatePath("/app/documents");
  return { ok: true, id: doc.id };
}

/**
 * Save changes to an existing DRAFT document. Issued documents can't be
 * edited (myDATA rules: once transmitted, only credit notes reverse them).
 * Replaces all lines atomically and recomputes totals.
 */
export async function updateDraftAction(
  documentId: string,
  input: DraftInput,
  options?: { confirmDuplicate?: boolean },
): Promise<DraftActionResult> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");

  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: formatZodError(parsed.error) };
  }

  const existing = await prisma.document.findFirst({
    where: { id: documentId, businessId: ctx.businessId },
    select: { id: true, status: true },
  });
  if (!existing) return { ok: false, error: "Το παραστατικό δεν βρέθηκε." };
  if (existing.status !== "draft") {
    return {
      ok: false,
      error:
        "Δεν επιτρέπεται επεξεργασία μη πρόχειρου παραστατικού. Εξέδωσε πιστωτικό για αντιλογισμό.",
    };
  }

  const totals = computeDocument(parsed.data.lines);

  const cashError = cashLimitViolation(
    parsed.data.paymentMethod,
    Number(totals.total),
  );
  if (cashError) return { ok: false, error: cashError };

  if (!options?.confirmDuplicate) {
    const matches = await findLikelyDuplicates({
      businessId: ctx.businessId,
      clientId: parsed.data.clientId || null,
      type: parsed.data.type,
      total: Number(totals.total),
      issueDate: new Date(parsed.data.issueDate),
      excludeId: existing.id,
    });
    if (matches.length > 0) {
      return {
        ok: false,
        kind: "duplicate",
        matches: matches.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
        })),
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    let series = parsed.data.series || null;
    let billingBookId: string | null = null;
    if (parsed.data.billingBookId) {
      const book = await tx.billingBook.findFirst({
        where: { id: parsed.data.billingBookId, businessId: ctx.businessId },
        select: { id: true, series: true },
      });
      if (book) {
        billingBookId = book.id;
        series = book.series;
      }
    }

    await tx.document.update({
      where: { id: documentId },
      data: {
        clientId: parsed.data.clientId || null,
        branchId: parsed.data.branchId || null,
        billingBookId,
        type: parsed.data.type,
        series,
        issueDate: new Date(parsed.data.issueDate),
        deliveryNoteRef: parsed.data.deliveryNoteRef || null,
        paymentMethod: parsed.data.paymentMethod || null,
        printLanguage: parsed.data.printLanguage,
        additionalTaxes: parsed.data.additionalTaxes || null,
        notes: parsed.data.notes || null,
        dispatchAt: parsed.data.dispatchAt
          ? new Date(parsed.data.dispatchAt)
          : null,
        dispatchReason: parsed.data.dispatchReason || null,
        dispatchPurpose: parsed.data.dispatchPurpose || null,
        loadingAddress: parsed.data.loadingAddress || null,
        destinationAddress: parsed.data.destinationAddress || null,
        vehicleNumber: parsed.data.vehicleNumber || null,
        driverName: parsed.data.driverName || null,
        correlatedDocumentId: CORRELATED_TYPES.includes(parsed.data.type)
          ? parsed.data.correlatedDocumentId || null
          : null,
        correlatedMarkOverride: CORRELATED_TYPES.includes(parsed.data.type)
          ? parsed.data.correlatedMarkOverride || null
          : null,
        currency:
          parsed.data.type === "eu_sale_invoice" ||
          parsed.data.type === "third_country_sale_invoice" ||
          parsed.data.type === "eu_service_invoice" ||
          parsed.data.type === "third_country_service_invoice"
            ? parsed.data.currency || null
            : null,
        exchangeRate:
          parsed.data.type === "eu_sale_invoice" ||
          parsed.data.type === "third_country_sale_invoice" ||
          parsed.data.type === "eu_service_invoice" ||
          parsed.data.type === "third_country_service_invoice"
            ? parsed.data.exchangeRate ?? null
            : null,
        stayTaxCategory:
          parsed.data.type === "stay_tax_receipt"
            ? parsed.data.stayTaxCategory || null
            : null,
        stayTaxAmount:
          parsed.data.type === "stay_tax_receipt"
            ? parsed.data.stayTaxAmount ?? null
            : null,
        netTotalAmount: totals.netTotal,
        vatTotalAmount: totals.vatTotal,
        totalAmount: totals.total,
        payableTotalAmount: totals.total,
      },
    });

    await tx.documentLine.deleteMany({ where: { documentId } });
    await tx.documentLine.createMany({
      data: parsed.data.lines.map((line, i) => {
        const t = computeLine(line);
        return {
          documentId,
          itemId: line.itemId || null,
          ordinal: i,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit || "τμχ",
          unitPrice: line.unitPrice,
          discountPct: line.discountPct,
          vatRate: line.vatRate,
          netAmount: t.net,
          vatAmount: t.vat,
          totalAmount: t.total,
        };
      }),
    });
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "document.draft.update",
    entityType: "Document",
    entityId: documentId,
  });

  revalidatePath(`/app/documents/${documentId}`);
  revalidatePath("/app/documents");
  return { ok: true, id: documentId };
}

/**
 * Duplicate an existing document into a fresh draft. Copies lines, client,
 * payment info, and notes; resets status to draft and issue-date to today.
 */
export async function duplicateDocumentAction(
  documentId: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");

  const src = await prisma.document.findFirst({
    where: { id: documentId, businessId: ctx.businessId },
    include: { lines: { orderBy: { ordinal: "asc" } } },
  });
  if (!src) return { ok: false, error: "Το παραστατικό δεν βρέθηκε." };

  const staging = await isStagingMode();

  const copy = await prisma.$transaction(async (tx) => {
    const d = await tx.document.create({
      data: {
        businessId: ctx.businessId,
        clientId: src.clientId,
        branchId: src.branchId,
        type: src.type,
        status: "draft",
        stagingMode: staging,
        series: src.series,
        issueDate: new Date(),
        deliveryNoteRef: src.deliveryNoteRef,
        paymentMethod: src.paymentMethod,
        printLanguage: src.printLanguage,
        additionalTaxes: src.additionalTaxes,
        notes: src.notes,
        netTotalAmount: src.netTotalAmount,
        vatTotalAmount: src.vatTotalAmount,
        totalAmount: src.totalAmount,
        payableTotalAmount: src.payableTotalAmount,
      },
    });
    await tx.documentLine.createMany({
      data: src.lines.map((l, i) => ({
        documentId: d.id,
        itemId: l.itemId,
        ordinal: i,
        description: l.description,
        quantity: l.quantity,
        unit: l.unit,
        unitPrice: l.unitPrice,
        discountPct: l.discountPct,
        vatRate: l.vatRate,
        netAmount: l.netAmount,
        vatAmount: l.vatAmount,
        totalAmount: l.totalAmount,
      })),
    });
    return d;
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "document.duplicate",
    entityType: "Document",
    entityId: copy.id,
    meta: { sourceId: documentId },
  });

  revalidatePath("/app/documents");
  return { ok: true, id: copy.id };
}

/**
 * Create a credit note draft against an existing issued document.
 *
 * Wrapp doesn't expose a `cancel` operation for the invoice types we
 * commonly issue (only delivery notes 9.3 can be cancelled via the
 * provider). The compliant reversal path is a credit note that
 * REFERENCES the original — myDATA 5.1 "πιστωτικό συσχετιζόμενο"
 * carrying the parent MARK. So we default to the correlated variant
 * whenever the source has a MARK, and only fall back to the
 * uncorrelated 5.2 when correlation is impossible.
 *
 *   retail receipt / simplified invoice   → retail_credit_note (11.4)
 *   invoice / service_invoice with MARK   → credit_note_correlated (5.1)
 *   invoice / service_invoice without MARK → credit_note (5.2)
 *
 * The client may still pick 5.2 explicitly by opening the draft in
 * the editor and switching the type — this action only sets the
 * default.
 */
export async function issueCreditNoteAction(
  documentId: string,
): Promise<
  | {
      ok: true;
      id: string;
      /**
       * True when Wrapp/myDATA accepted the credit note immediately.
       * When false, the draft was saved but transmission failed — the
       * caller should show `transmitError` so the user knows to retry
       * from the detail view (Επίσημη έκδοση button).
       */
      transmitted: boolean;
      series?: string | null;
      number?: number | null;
      transmitError?: string;
    }
  | { ok: false; error: string }
> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");

  const src = await prisma.document.findFirst({
    where: { id: documentId, businessId: ctx.businessId },
    include: { lines: { orderBy: { ordinal: "asc" } } },
  });
  if (!src) return { ok: false, error: "Το παραστατικό δεν βρέθηκε." };
  if (src.status !== "issued") {
    return {
      ok: false,
      error: "Πιστωτικό εκδίδεται μόνο για παραστατικά που έχουν εκδοθεί.",
    };
  }
  if (
    src.type === "credit_note" ||
    src.type === "credit_note_correlated" ||
    src.type === "retail_credit_note"
  ) {
    return {
      ok: false,
      error:
        "Δεν επιτρέπεται πιστωτικό πάνω σε άλλο πιστωτικό. Το πιστωτικό εκδίδεται μόνο πάνω σε τιμολόγιο ή απόδειξη.",
    };
  }

  // Retail receipts get the retail credit note (11.4). Everything else
  // that has a MARK becomes correlated (5.1). Only fall back to 5.2
  // when we can't correlate.
  const isRetail =
    src.type === "retail_receipt" ||
    src.type === "third_party_retail_receipt" ||
    src.type === "simplified_invoice" ||
    src.type === "service_receipt";
  let creditType: DocumentType;
  if (isRetail) {
    creditType = "retail_credit_note";
  } else if (src.myDataMark) {
    creditType = "credit_note_correlated";
  } else {
    creditType = "credit_note";
  }

  if (src.lines.length === 0) {
    return {
      ok: false,
      error:
        "Το γονικό παραστατικό δεν έχει γραμμές — δεν μπορεί να παραχθεί πιστωτικό. Επεξεργάσου πρώτα το αρχικό.",
    };
  }

  // DocumentLine.description is VarChar(255); the "Πιστωτικό: " prefix
  // (12 chars) can push a long line description over the limit and
  // trigger a DB-level 500. Truncate defensively.
  const CREDIT_PREFIX = "Πιστωτικό: ";
  const DESC_MAX = 255;

  const totals = { net: 0, vat: 0, tot: 0 };
  const staging = await isStagingMode();

  try {
    const credit = await prisma.$transaction(async (tx) => {
      const d = await tx.document.create({
        data: {
          businessId: ctx.businessId,
          clientId: src.clientId,
          branchId: src.branchId,
          type: creditType,
          stagingMode: staging,
          status: "draft",
          // Athens-local today. `new Date()` here would use container
          // UTC time — the resulting timestamp still formats correctly
          // in Athens locale, but any downstream code that slices to
          // `YYYY-MM-DD` in UTC would land the row on yesterday after
          // Athens midnight. Anchoring at 00:00 UTC of today's Athens
          // date sidesteps that class of bug entirely.
          issueDate: new Date(todayInAthens()),
          printLanguage: src.printLanguage,
          // Correlated + retail-credit variants carry a reference to the
          // parent doc so the editor's CorrelatedInvoicePicker pre-selects
          // it and the myDATA payload includes the parent's MARK.
          correlatedDocumentId:
            creditType === "credit_note_correlated" ||
            creditType === "retail_credit_note"
              ? src.id
              : null,
          notes: `Πιστωτικό για το ${src.type} με σειρά ${src.series ?? "-"} #${src.number ?? ""}`,
          netTotalAmount: 0,
          vatTotalAmount: 0,
          totalAmount: 0,
          payableTotalAmount: 0,
        },
      });
      await tx.documentLine.createMany({
        data: src.lines.map((l, i) => {
          const netN = -Number(l.netAmount);
          const vatN = -Number(l.vatAmount);
          const totN = -Number(l.totalAmount);
          totals.net += netN;
          totals.vat += vatN;
          totals.tot += totN;
          const desc = (CREDIT_PREFIX + (l.description ?? "")).slice(0, DESC_MAX);
          return {
            documentId: d.id,
            itemId: l.itemId,
            ordinal: i,
            description: desc,
            quantity: -Number(l.quantity),
            unit: l.unit,
            unitPrice: Number(l.unitPrice),
            discountPct: Number(l.discountPct),
            vatRate: Number(l.vatRate),
            netAmount: netN,
            vatAmount: vatN,
            totalAmount: totN,
          };
        }),
      });
      await tx.document.update({
        where: { id: d.id },
        data: {
          netTotalAmount: totals.net,
          vatTotalAmount: totals.vat,
          totalAmount: totals.tot,
          payableTotalAmount: totals.tot,
        },
      });
      return d;
    });

    await logAudit({
      userId: ctx.userId,
      businessId: ctx.businessId,
      action: "document.credit_note.create",
      entityType: "Document",
      entityId: credit.id,
      meta: { sourceId: documentId, creditType },
    });

    revalidatePath("/app/documents");

    // Auto-transmit — the draft-then-edit hop was leaving every credit
    // note stuck as πρόχειρο because the user rarely completed the
    // extra "Διαβίβαση στο myDATA" step. attemptIssueAction handles
    // number reservation, Wrapp billing-book sync, correlated MARK
    // wiring, and status transitions. If transmission fails we STILL
    // return ok=true with the draft id and transmitError set, so the
    // client can toast the reason and land the user on the detail view
    // where they can retry via the Επίσημη έκδοση button.
    //
    // Guarded by its own try/catch so a permission error (assertCan
    // "document:issue" inside attemptIssueAction) or an unhandled
    // Wrapp exception can't wipe out the just-created draft.
    let transmit: Awaited<ReturnType<typeof attemptIssueAction>>;
    try {
      transmit = await attemptIssueAction(credit.id);
    } catch (transmitErr) {
      logger.error("document.credit_note.autotransmit.crashed", transmitErr, {
        businessId: ctx.businessId,
        creditId: credit.id,
        creditType,
      });
      return {
        ok: true,
        id: credit.id,
        transmitted: false,
        transmitError:
          "Το πιστωτικό αποθηκεύτηκε αλλά η διαβίβαση δεν ολοκληρώθηκε λόγω τεχνικού σφάλματος.",
      };
    }
    if (transmit.ok) {
      return {
        ok: true,
        id: credit.id,
        transmitted: true,
        series: transmit.series ?? null,
        number: transmit.number ?? null,
      };
    }
    return {
      ok: true,
      id: credit.id,
      transmitted: false,
      transmitError: transmit.error,
    };
  } catch (err) {
    logger.error("document.credit_note.create.failed", err, {
      businessId: ctx.businessId,
      sourceId: documentId,
      creditType,
    });
    return {
      ok: false,
      error:
        "Δεν καταφέραμε να δημιουργήσουμε το πιστωτικό. Δοκίμασε ξανά — αν επιμένει, στείλε το ID του παραστατικού στο υποστήριξη.",
    };
  }
}

const sendDocSchema = z.object({
  documentId: z.string().min(1),
  recipientEmail: z
    .string()
    .trim()
    .email({ message: "Δώσε έγκυρη διεύθυνση email." }),
  message: z.string().max(2000).optional(),
});

/**
 * Send the issued document to an arbitrary email address via Brevo.
 * Called by the "Αποστολή email" popup on the doc detail page. The
 * recipient defaults to the client's email in the UI but the user can
 * type anything — accountant, secondary contact, themselves.
 *
 * Requires the doc to be `issued` so there's a public link + PDF to send.
 * Uses the same tenant-configured Brevo API key as every other outbound
 * email (getEmailConfig → AppSetting rows).
 */
export async function sendDocumentEmailAction(input: {
  documentId: string;
  recipientEmail: string;
  message?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:read");

  const parsed = sendDocSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Μη έγκυρα στοιχεία.",
    };
  }

  const doc = await prisma.document.findFirst({
    where: {
      id: parsed.data.documentId,
      businessId: ctx.businessId,
    },
    include: {
      client: { select: { legalName: true, tradeName: true } },
    },
  });
  if (!doc) return { ok: false, error: "Το παραστατικό δεν βρέθηκε." };
  if (doc.status !== "issued") {
    return {
      ok: false,
      error:
        "Το παραστατικό δεν έχει εκδοθεί ακόμη — μπορείς να στείλεις email μόνο για εκδοθέντα παραστατικά.",
    };
  }

  const business = await prisma.business.findUnique({
    where: { id: ctx.businessId },
    select: { legalName: true, tradeName: true },
  });
  const senderName =
    business?.tradeName ?? business?.legalName ?? "Ο εκδότης";
  const clientName =
    doc.client?.tradeName ?? doc.client?.legalName ?? "Πελάτης";
  const docTypeLabel = t.documents.types[doc.type] ?? doc.type;
  const docNumber =
    (doc.series ?? "") + (doc.number != null ? " #" + doc.number : "");
  const money = new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(doc.totalAmount));

  // Prefer the tenant-branded Wrapp link (with QR + PDF) if available;
  // fall back to the app's own detail page. Both live under HTTPS.
  const documentUrl =
    doc.wrappInvoiceUrl ||
    `${process.env.APP_BASE_URL ?? "https://timologion.gr"}/app/documents/${doc.id}`;

  const { subject, html, text } = documentToClientTemplate({
    clientName,
    senderName,
    docType: docTypeLabel,
    docNumber,
    docTotal: money,
    documentUrl,
    note: parsed.data.message?.trim() || null,
  });

  const trimmedRecipientName = clientName?.trim();
  const send = await sendEmail({
    to: {
      email: parsed.data.recipientEmail,
      ...(trimmedRecipientName ? { name: trimmedRecipientName } : {}),
    },
    subject,
    html,
    text,
  });

  if (!send.ok) {
    logger.error("document.send_email.failed", new Error(send.error), {
      businessId: ctx.businessId,
      documentId: doc.id,
      status: send.status ?? null,
    });
    return {
      ok: false,
      error:
        "Δεν καταφέραμε να στείλουμε το email. Δοκίμασε ξανά — αν επιμένει, ελέγξε τις ρυθμίσεις email της πλατφόρμας.",
    };
  }

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "document.send_email",
    entityType: "Document",
    entityId: doc.id,
    meta: { to: parsed.data.recipientEmail, messageId: send.messageId },
  });

  return { ok: true };
}

export async function deleteDraftAction(documentId: string) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");
  const doc = await prisma.document.findFirst({
    where: { id: documentId, businessId: ctx.businessId },
    select: { id: true, status: true },
  });
  if (!doc || doc.status !== "draft")
    return { ok: false as const, error: "Μόνο πρόχειρα διαγράφονται." };
  await prisma.$transaction([
    prisma.documentLine.deleteMany({ where: { documentId } }),
    prisma.document.delete({ where: { id: documentId } }),
  ]);
  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "document.draft.delete",
    entityType: "Document",
    entityId: documentId,
  });
  revalidatePath("/app/documents");
  return { ok: true as const };
}

/**
 * Bulk-delete drafts. Filters the incoming ids down to genuine drafts
 * belonging to this tenant before touching anything — never trust the
 * client to have given us clean input. Returns the count actually
 * deleted so the UI can show "N πρόχειρα διαγράφηκαν".
 */
export async function bulkDeleteDraftsAction(documentIds: string[]) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");
  const ids = Array.from(
    new Set(documentIds.filter((s): s is string => typeof s === "string" && !!s)),
  );
  if (ids.length === 0) {
    return { ok: true as const, deleted: 0 };
  }
  const drafts = await prisma.document.findMany({
    where: {
      id: { in: ids },
      businessId: ctx.businessId,
      status: "draft",
    },
    select: { id: true },
  });
  const draftIds = drafts.map((d) => d.id);
  if (draftIds.length === 0) {
    return { ok: true as const, deleted: 0 };
  }
  await prisma.$transaction([
    prisma.documentLine.deleteMany({
      where: { documentId: { in: draftIds } },
    }),
    prisma.document.deleteMany({
      where: { id: { in: draftIds } },
    }),
  ]);
  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "document.draft.bulk_delete",
    entityType: "Document",
    entityId: draftIds[0],
    meta: { count: draftIds.length, ids: draftIds },
  });
  revalidatePath("/app/documents");
  return { ok: true as const, deleted: draftIds.length };
}

// EU member state 2-letter ISO codes — used to gate intracommunity vs
// third-country validation. Excludes GR intentionally: intra-EU invoices
// require a NON-Greek EU counterpart. Kept as a Set for O(1) lookup.
const EU_COUNTRY_CODES: ReadonlySet<string> = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "HU",
  "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI",
  "ES", "SE",
]);

// Doc types where every line's VAT rate must be 0 (myDATA vatCategory 7).
// Includes intra-EU / third-country flows (exemption code = the EU
// Article ID) AND τίτλος κτήσης 3.1/3.2 which is buyer-issued for a
// non-obligated seller and always carries 0% VAT (κατηγορία 8 -
// χωρίς ΦΠΑ, per AADE, exemption code 1 = Άρθρο 2 & 3).
const ZERO_VAT_TYPES: ReadonlySet<DocumentType> = new Set([
  "eu_sale_invoice",
  "eu_service_invoice",
  "third_country_sale_invoice",
  "third_country_service_invoice",
  "purchase_title",
  "purchase_title_refused",
] as const);

// The block list is now EMPTY — after wiring the correct Wrapp fields
// (`expense: true` for 17.x, `accommodation_tax` + `other_taxes_amount`
// for 8.2, correct classification codes per doc type per AADE spec),
// every myDATA type our doc-picker exposes can transmit through the
// standard pipeline. Kept as a `Set<DocumentType>` (rather than
// deleted) so the mechanism stays in place — if we discover a new
// blocking edge case later, add its DocumentType here and the
// pre-issue guard + UI hide-list pick it up automatically.
const BLOCKED_FROM_AUTO_TRANSMIT: ReadonlySet<DocumentType> = new Set([]);

type PreflightDoc = {
  type: DocumentType;
  client: { country: string | null } | null;
  lines: { vatRate: unknown }[];
  correlatedDocument: { myDataMark: string | null } | null;
  correlatedMarkOverride: string | null;
  dispatchAt: Date | null;
  issueDate: Date;
  additionalTaxes: string | null;
};

/**
 * Cheap up-front checks that mirror the myDATA validator rules we know
 * about. When any fires we refuse to submit and return a plain-Greek
 * message that names the specific field to fix. This replaces surfacing
 * raw English validator errors like "Vat category must have value 7…".
 */
function preIssueValidation(doc: PreflightDoc): string | null {
  const country = doc.client?.country?.trim().toUpperCase() || null;

  // Types the automated sales-transmission pipeline can't reliably
  // build a myDATA payload for. Each family has a slightly different
  // reason (settlement uses expenses classification, self-supply needs
  // KAD-specific category1_10 mapping, τίτλος κτήσης is buyer-issued,
  // ενοίκιο/συμβόλαιο need Άλλα Έσοδα codes that vary per business).
  if (BLOCKED_FROM_AUTO_TRANSMIT.has(doc.type)) {
    const familyMessages: Partial<Record<DocumentType, string>> = {
      income_settlement_accounting:
        "Εγγραφή τακτοποίησης εσόδων (17.1) — απαιτεί ταξινόμηση εξόδων και χωρίς γραμμές πώλησης.",
      income_settlement_tax:
        "Εγγραφή τακτοποίησης εσόδων φορολογικής βάσης (17.2) — απαιτεί ταξινόμηση εξόδων και χωρίς γραμμές πώλησης.",
      expense_settlement_accounting:
        "Εγγραφή τακτοποίησης εξόδων (17.3) — απαιτεί ταξινόμηση εξόδων.",
      expense_settlement_tax:
        "Εγγραφή τακτοποίησης εξόδων φορολογικής βάσης (17.4) — απαιτεί ταξινόμηση εξόδων.",
      payroll_entry:
        "Ενσωμάτωση μισθοδοσίας (17.5) — απαιτεί ειδική δομή payload μισθοδοσίας.",
      depreciation:
        "Αποσβέσεις (17.6) — απαιτεί ειδική δομή payload αποσβέσεων.",
      self_delivery:
        "Στοιχεία αυτοπαράδοσης (6.1) — η ταξινόμηση εξαρτάται από τον ΚΑΔ της επιχείρησης (category1_10 / E3_595) και από το είδος του εμπορεύματος.",
      self_use:
        "Στοιχεία ιδιοχρησιμοποίησης (6.2) — η ταξινόμηση εξαρτάται από τον ΚΑΔ της επιχείρησης (category1_10 / E3_595).",
      purchase_title:
        "Τίτλος κτήσης (3.1) — εκδίδεται από τον αγοραστή για μη υπόχρεο πωλητή· απαιτεί ειδική δομή payload.",
      purchase_title_refused:
        "Τίτλος κτήσης (3.2 – άρνηση έκδοσης) — απαιτεί ειδική δομή payload.",
      rental_income:
        "Ενοίκιο (έσοδο, 8.1) — απαιτεί ειδική κατηγορία Άλλα Έσοδα Ακινήτων που εξαρτάται από τον ΚΑΔ.",
      contract_income:
        "Συμβόλαιο (έσοδο, 7.1) — απαιτεί ειδική κατηγορία Άλλα Έσοδα που εξαρτάται από τον ΚΑΔ.",
      stay_tax_receipt:
        "Απόδειξη φόρου διαμονής (8.2) — απαιτεί ειδική δομή Επιπλέον Φόρων και OtherTaxesPercentCategory.",
    };
    const reason =
      familyMessages[doc.type] ??
      "Αυτός ο τύπος παραστατικού απαιτεί ειδική δομή myDATA payload.";
    return (
      reason +
      " " +
      "Το πρόχειρο έχει αποθηκευτεί εδώ, αλλά η αυτόματη διαβίβαση δεν υποστηρίζεται. " +
      "Χρησιμοποίησε τη λογιστική σου εφαρμογή ή απευθείας το portal της ΑΑΔΕ (myDATA REST) για να ολοκληρώσεις τη διαβίβαση."
    );
  }

  // Intra-EU sales/services (1.2 / 2.2)
  if (doc.type === "eu_sale_invoice" || doc.type === "eu_service_invoice") {
    if (!country || country === "GR" || !EU_COUNTRY_CODES.has(country)) {
      return (
        "Το ενδοκοινοτικό παραστατικό απαιτεί πελάτη από χώρα Ε.Ε. εκτός Ελλάδας. " +
        "Άνοιξε την καρτέλα του πελάτη και όρισε ισχύον κωδικό χώρας Ε.Ε. (π.χ. DE, IT, FR, CY)."
      );
    }
  }

  // Third-country sales/services (1.3 / 2.3)
  if (
    doc.type === "third_country_sale_invoice" ||
    doc.type === "third_country_service_invoice"
  ) {
    if (!country || country === "GR" || EU_COUNTRY_CODES.has(country)) {
      return (
        "Το παραστατικό τρίτης χώρας απαιτεί πελάτη εκτός Ε.Ε. " +
        "Ενημέρωσε τη χώρα του πελάτη (π.χ. US, GB, CH, TR) και ξαναπροσπάθησε."
      );
    }
  }

  // Zero-VAT types — every line must have vatRate 0
  if (ZERO_VAT_TYPES.has(doc.type)) {
    const bad = doc.lines.find((l) => Number(l.vatRate) !== 0);
    if (bad) {
      return (
        "Αυτός ο τύπος παραστατικού απαιτεί 0% ΦΠΑ σε όλες τις γραμμές. " +
        "Άνοιξε το πρόχειρο και άλλαξε το ΦΠΑ των γραμμών σε 0."
      );
    }
  }

  // Correlated types — the MARK check already lives in attemptIssueForBusiness,
  // but running it here too gives the user a consistent Greek message
  // before we start reserving numbers.
  const needsMark: Partial<Record<DocumentType, string>> = {
    credit_note_correlated: "Το πιστωτικό συσχετιζόμενο (5.1)",
    stay_tax_receipt: "Η απόδειξη φόρου διαμονής (8.2)",
    complementary_invoice: "Το συμπληρωματικό τιμολόγιο (1.6)",
    complementary_service_invoice: "Το συμπληρωματικό παροχής (2.4)",
    retail_refund_receipt: "Η απόδειξη επιστροφής (11.4)",
    retail_credit_note: "Το πιστωτικό λιανικής (11.4)",
    delivery_note_correlated: "Το δελτίο αποστολής συσχετιζόμενο (9.3)",
  };
  const label = needsMark[doc.type];
  if (label) {
    const parentMark =
      doc.correlatedDocument?.myDataMark ?? doc.correlatedMarkOverride;
    if (!parentMark) {
      return (
        `${label} απαιτεί το MARK του γονικού παραστατικού. ` +
        "Άνοιξε την επεξεργασία και επίλεξε το γονικό στο πεδίο " +
        "«Συσχετιζόμενο παραστατικό», ή δώσε το MARK χειροκίνητα."
      );
    }
  }

  // Stay-tax receipts (8.2) require Επιπλέον φόροι populated
  if (doc.type === "stay_tax_receipt") {
    const raw = doc.additionalTaxes?.trim();
    if (!raw) {
      return (
        "Η απόδειξη φόρου διαμονής απαιτεί καταχώρηση Επιπλέον Φόρου. " +
        "Άνοιξε την επεξεργασία και πρόσθεσε γραμμή στο πεδίο «Επιπλέον φόροι» " +
        "με την κατηγορία «Φόρος διαμονής» και το αντίστοιχο ποσό."
      );
    }
  }

  // Delivery notes — the payload builder now auto-bumps dispatch time
  // forward to issueDate + 1min if it's earlier, so this used to fire
  // in normal use and confused users. Only reject if the dispatch is
  // MORE than 1 day before the issue (clearly a data entry mistake,
  // not a clock skew or minute-precision race).
  if (
    doc.type === "delivery_note" ||
    doc.type === "delivery_note_correlated"
  ) {
    if (
      doc.dispatchAt &&
      doc.dispatchAt.getTime() < doc.issueDate.getTime() - 86_400_000
    ) {
      return (
        "Η ημερομηνία αποστολής του δελτίου είναι πριν από την ημερομηνία έκδοσης. " +
        "Άνοιξε την επεξεργασία και όρισε ημερομηνία αποστολής ίση ή μεταγενέστερη."
      );
    }
  }

  return null;
}

export async function attemptIssueAction(documentId: string) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:issue");
  return attemptIssueForBusiness(ctx.businessId, ctx.userId, documentId);
}

/**
 * Session-free core of the "issue draft → myDATA" flow.
 *
 * `attemptIssueAction` is the interactive entry point (RBAC + tenant cookie),
 * but non-interactive callers (the recurring cron for auto-transmit templates,
 * future webhook retry loops, etc.) need the same transmission logic without
 * a user session. They pass `businessId` + optional `actorUserId` explicitly
 * and skip the RBAC check — the caller is responsible for its own authz.
 *
 * `actorUserId` is nullable so system-triggered audit rows are attributed to
 * a null actor (audit.userId is a nullable FK on purpose).
 */
export async function attemptIssueForBusiness(
  businessId: string,
  actorUserId: string | null,
  documentId: string,
) {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, businessId },
    include: {
      client: true,
      lines: true,
      correlatedDocument: { select: { myDataMark: true } },
    },
  });
  if (!doc) return { ok: false as const, error: "Το παραστατικό δεν βρέθηκε." };
  if (doc.status !== "draft")
    return { ok: false as const, error: "Μόνο πρόχειρα μπορούν να εκδοθούν." };

  const cashError = cashLimitViolation(
    doc.paymentMethod,
    Number(doc.totalAmount),
  );
  if (cashError) return { ok: false as const, error: cashError };

  // ─── Pre-issue validation (plain Greek) ──────────────────────────
  // These catch conditions Wrapp/myDATA rejects with English validator
  // errors that scare users. We stop the submission early with a clear,
  // actionable message so the user knows exactly what to fix.
  const preflightError = preIssueValidation(doc);
  if (preflightError) {
    // Persist the friendly reason so it shows on the detail card even
    // if the toast is dismissed before the user reads it.
    await prisma.document
      .update({
        where: { id: doc.id },
        data: { lastWrappError: preflightError },
      })
      .catch(() => undefined);
    return { ok: false as const, error: preflightError };
  }

  const wrapp = await prisma.wrappConnection.findUnique({
    where: { businessId: businessId },
  });

  if (!wrapp || wrapp.status !== "active" || !wrapp.canIssueInvoice) {
    return {
      ok: false as const,
      error:
        "Δεν έχει ολοκληρωθεί η ενεργοποίηση της υπηρεσίας ηλεκτρονικής έκδοσης. Ολοκλήρωσε τη σύνδεση με τον πάροχο για να ξεκινήσεις.",
    };
  }

  // Auto-provision a local billing book if the draft was saved without one
  // (race: user hit save before the editor's silent auto-create finished,
  // or the draft was created for a different type and the switch never
  // fired). Idempotent — no-op if a book already exists for this type.
  let effectiveBillingBookId = doc.billingBookId;
  if (!effectiveBillingBookId) {
    try {
      const ensured = await ensureDefaultBillingBook(businessId, doc.type);
      effectiveBillingBookId = ensured.id;
      await prisma.document.update({
        where: { id: doc.id },
        data: { billingBookId: ensured.id },
      });
    } catch (err) {
      logger.error("wrapp.issue.autoprovision_local_book_failed", err, {
        businessId: businessId,
        documentId: doc.id,
        type: doc.type,
      });
      return {
        ok: false as const,
        error:
          "Δεν καταφέραμε να δημιουργήσουμε αυτόματα σειρά παραστατικών. Δοκίμασε ξανά σε λίγο.",
      };
    }
  }

  // Local quota is display-only — the certified provider is the real gate
  // and will reject transmission if the tenant is over its yearly package.
  // Reserve the next number atomically from the billing book. Runs in its own
  // transaction so the number is committed even if the Wrapp call fails —
  // a small numbering gap is preferable to duplicate numbers under concurrency.
  let reservedSeries: string | null = doc.series;
  let reservedNumber: number | null = doc.number;
  if (doc.number == null) {
    const bookId = effectiveBillingBookId;
    const reservation = await prisma.$transaction(async (tx) => {
      return reserveNextNumber(tx, bookId, businessId);
    });
    if (!reservation) {
      return {
        ok: false as const,
        error: "Η σειρά παραστατικών δεν βρέθηκε — έλεγξε τις ρυθμίσεις.",
      };
    }
    reservedSeries = reservation.series;
    reservedNumber = reservation.number;
    await prisma.document.update({
      where: { id: doc.id },
      data: {
        series: reservation.series,
        number: reservation.number,
        status: "sending",
      },
    });
  } else {
    // Number already stamped (retry of a failed issue). Just flip status.
    await prisma.document.update({
      where: { id: doc.id },
      data: { status: "sending" },
    });
  }

  // ─── Build the Wrapp invoice payload ─────────────────────────────────
  const invoiceTypeCode = mapDocumentTypeToWrapp(doc.type);
  if (!invoiceTypeCode) {
    // Local-only types (proforma / quote / order): mark issued locally
    // without hitting Wrapp; there's no myDATA channel for these.
    await prisma.document.update({
      where: { id: doc.id },
      data: { status: "issued" },
    });
    return { ok: true as const, series: reservedSeries, number: reservedNumber };
  }

  // Auto-sync the billing book with Wrapp on first use — never surface the
  // "σειρά δεν είναι συγχρονισμένη" dead-end anymore.
  const sync = await ensureWrappBillingBookSynced(
    businessId,
    effectiveBillingBookId,
    invoiceTypeCode,
  );
  if ("error" in sync) {
    await prisma.document
      .update({ where: { id: doc.id }, data: { status: "draft" } })
      .catch(() => undefined);
    return { ok: false as const, error: sync.error };
  }
  const book = { wrappBookId: sync.wrappBookId };

  const branch = doc.branchId
    ? await prisma.branch.findUnique({
        where: { id: doc.branchId },
        select: {
          wrappBranchId: true,
          addressLine: true,
          city: true,
          postalCode: true,
          label: true,
        },
      })
    : null;

  // Delivery notes need the issuer's dispatch address. Prefer the branch
  // address if a branch is set on the doc; otherwise fall back to the
  // business address. Both are fetched only for delivery_note to avoid an
  // extra query on every invoice.
  const issuerAddress =
    doc.type === "delivery_note" || doc.type === "delivery_note_correlated"
      ? branch?.addressLine
        ? {
            legalName: null as string | null,
            addressLine: branch.addressLine,
            city: branch.city,
            postalCode: branch.postalCode,
          }
        : await prisma.business
            .findUnique({
              where: { id: businessId },
              select: {
                legalName: true,
                addressLine: true,
                city: true,
                postalCode: true,
              },
            })
            .then((b) =>
              b
                ? {
                    legalName: b.legalName,
                    addressLine: b.addressLine,
                    city: b.city,
                    postalCode: b.postalCode,
                  }
                : null,
            )
      : null;

  const classification = classificationFor(doc.type);

  // myDATA-safe fallbacks: Wrapp's validator rejects empty/missing values on
  // required customer fields with generic errors like "Account δεν πρέπει να
  // είναι κενό". Match FishBill's audit-verified defaults (000000000 VAT,
  // 00000 postal, generic strings for missing city/street) so the payload
  // always validates even when the user hasn't fully filled in the client.
  const parseStreet = (raw: string | null | undefined) => {
    if (!raw) return { street: "-", number: "0" };
    const m = raw.trim().match(/^(.*?)\s+(\S+)$/);
    if (m) return { street: m[1] || "-", number: m[2] || "0" };
    return { street: raw.trim() || "-", number: "0" };
  };
  const normalizePostal = (raw: string | null | undefined) => {
    const digits = String(raw ?? "").replace(/\D/g, "");
    if (digits.length === 5) return digits;
    if (digits.length > 5) return digits.slice(0, 5);
    return "00000";
  };
  const clientStreet = parseStreet(doc.client?.addressLine);

  // Retail codes (11.x) + POS receipts (8.5/8.6) + retail refund (8.4) are
  // anonymous by design. myDATA rejects them if a counterpart with a fake
  // VAT is sent — for these types we skip the counterpart entirely unless
  // the user explicitly attached a client (some POS flows do).
  const anonymousRetail =
    (doc.type === "retail_receipt" ||
      doc.type === "service_receipt" ||
      doc.type === "simplified_invoice" ||
      doc.type === "retail_credit_note" ||
      doc.type === "retail_refund_receipt" ||
      doc.type === "pos_income_receipt" ||
      doc.type === "pos_payment_receipt" ||
      doc.type === "third_party_retail_receipt") &&
    !doc.client;

  const counterpart = anonymousRetail
    ? undefined
    : doc.client
      ? {
          name: doc.client.legalName?.trim() || "Πελάτης",
          country_code: doc.client.country ?? "GR",
          vat: doc.client.vatNumber?.replace(/\D/g, "") || "000000000",
          city: doc.client.city?.trim() || "-",
          street: clientStreet.street,
          number: clientStreet.number,
          postal_code: normalizePostal(doc.client.postalCode),
          email: doc.client.email ?? undefined,
        }
      : {
          // Non-retail type without a client picked — myDATA needs a
          // counterpart on B2B codes. Send an anonymous consumer placeholder
          // as a last resort so the invoice can still be issued.
          name: "Ιδιώτης καταναλωτής",
          country_code: "GR",
          vat: "000000000",
          city: "-",
          street: "-",
          number: "0",
          postal_code: "00000",
        };

  // Credit / refund types: we store the totals + line amounts as NEGATIVE
  // numbers so the local ledger balances correctly, but Wrapp/myDATA
  // require POSITIVE numbers on the wire (the invoice_type_code 5.1/5.2/
  // 8.4/11.4 tells them it's a reversal). Force abs() on all refund
  // codes so the payload validates.
  const isRefundLike =
    doc.type === "credit_note" ||
    doc.type === "credit_note_correlated" ||
    doc.type === "retail_credit_note" ||
    doc.type === "retail_refund_receipt";
  const wire = isRefundLike ? (n: number) => Math.abs(n) : (n: number) => n;

  // Build the delivery-note (9.3) shipping block from the dispatch fields
  // we captured in the draft. Wrapp requires most fields to be present so we
  // fill safe fallbacks for anything the user left empty — myDATA rejects
  // NULLs on 9.3 payloads.
  const deliveryDetail =
    doc.type === "delivery_note" || doc.type === "delivery_note_correlated"
      ? buildDeliveryDetail({
          dispatchAt: doc.dispatchAt,
          issueDate: doc.issueDate,
          dispatchReason: doc.dispatchReason,
          dispatchPurpose: doc.dispatchPurpose,
          loadingAddress: doc.loadingAddress,
          destinationAddress: doc.destinationAddress,
          vehicleNumber: doc.vehicleNumber,
          driverName: doc.driverName,
          issuerAddress,
          branchCode: branch?.wrappBranchId ?? null,
          fallbackParseStreet: parseStreet,
          fallbackNormalizePostal: normalizePostal,
        })
      : undefined;

  // Correlated types (5.1, 8.2, 1.6, 2.4, 8.4, 11.4, 9.3-correlated) —
  // Wrapp requires the parent's myDATA MARK in `correlated_invoices`.
  // We prefer the linked local doc's stored MARK; the manual override
  // is the escape hatch for pre-migration parents that live outside
  // timologion.
  const correlatedTypeLabels: Partial<Record<DocumentType, string>> = {
    credit_note_correlated: "Το πιστωτικό 5.1 (συσχετιζόμενο)",
    stay_tax_receipt: "Η απόδειξη φόρου διαμονής (8.2)",
    complementary_invoice: "Το συμπληρωματικό τιμολόγιο (1.6)",
    complementary_service_invoice: "Το συμπληρωματικό παροχής (2.4)",
    retail_refund_receipt: "Η απόδειξη επιστροφής (11.4)",
    retail_credit_note: "Το πιστωτικό λιανικής (11.4)",
    delivery_note_correlated: "Το δελτίο αποστολής συσχετιζόμενο (9.3)",
  };
  let correlatedInvoices: string[] | undefined;
  if (correlatedTypeLabels[doc.type]) {
    const parentMark =
      doc.correlatedDocument?.myDataMark ?? doc.correlatedMarkOverride;
    if (!parentMark) {
      await prisma.document
        .update({ where: { id: doc.id }, data: { status: "draft" } })
        .catch(() => undefined);
      return {
        ok: false as const,
        error: `${correlatedTypeLabels[doc.type]} απαιτεί το MARK του γονικού παραστατικού. Επίλεξε το γονικό στο πεδίο «Συσχετιζόμενο παραστατικό» ή δώσε το MARK χειροκίνητα.`,
      };
    }
    correlatedInvoices = [parentMark];
  }

  // Foreign transactions (1.2 / 1.3 / 2.2 / 2.3) need currency + rate on
  // the Wrapp payload. myDATA rejects non-EUR invoices without the pair.
  const isForeign =
    doc.type === "eu_sale_invoice" ||
    doc.type === "third_country_sale_invoice" ||
    doc.type === "eu_service_invoice" ||
    doc.type === "third_country_service_invoice";
  if (isForeign) {
    if (!doc.currency || doc.currency.length !== 3) {
      await prisma.document
        .update({ where: { id: doc.id }, data: { status: "draft" } })
        .catch(() => undefined);
      return {
        ok: false as const,
        error:
          "Για ενδοκοινοτικές πωλήσεις/παροχές ή τρίτες χώρες απαιτείται 3-ψήφιος κωδικός νομίσματος (ISO 4217).",
      };
    }
    if (!doc.exchangeRate || Number(doc.exchangeRate) <= 0) {
      await prisma.document
        .update({ where: { id: doc.id }, data: { status: "draft" } })
        .catch(() => undefined);
      return {
        ok: false as const,
        error:
          "Για ενδοκοινοτικές πωλήσεις/παροχές ή τρίτες χώρες απαιτείται ισοτιμία μεγαλύτερη του μηδενός.",
      };
    }
  }

  // Deliver the customer their PDF/e-mail automatically when we have an
  // email on file. Wrapp will only fire emails when the payload has a
  // valid `customer_emails` array. Falls back to explicit empty so we
  // don't accidentally trigger a Wrapp email to an empty string.
  const customerEmail = doc.client?.email?.trim() || null;
  const customerEmails =
    customerEmail && /@/.test(customerEmail) ? [customerEmail] : undefined;
  const emailLocale: "el" | "en" | undefined =
    doc.printLanguage === "en" ? "en" : doc.printLanguage === "el" ? "el" : undefined;

  // Per-type payload shape signals (used further down):
  //   isSettlement: 17.x — expense flag on lines, no payment method
  //   isStayTax:    8.2  — accommodation_tax on line, no name/quantity/vat
  const isSettlement =
    doc.type === "payroll_entry" ||
    doc.type === "depreciation" ||
    doc.type === "income_settlement_accounting" ||
    doc.type === "income_settlement_tax" ||
    doc.type === "expense_settlement_accounting" ||
    doc.type === "expense_settlement_tax";
  // ONLY the true expense-side 17.x types (τακτοποιήσεις ΕΞΟΔΩΝ,
  // μισθοδοσία, αποσβέσεις) use expensesClassifications. The income
  // variants (17.3/17.4 τακτοποιήσεις ΕΣΟΔΩΝ) MUST use
  // incomeClassifications — Wrapp's validator explicitly says
  // "incomeClassification is mandatory; expensesClassification is
  // forbidden" for those subtypes.
  const isExpenseSide =
    doc.type === "expense_settlement_accounting" ||
    doc.type === "expense_settlement_tax" ||
    doc.type === "payroll_entry" ||
    doc.type === "depreciation" ||
    // Τίτλος κτήσης (3.1/3.2) — buyer-issued for a non-obligated
    // seller. Same expensesClassifications requirement.
    doc.type === "purchase_title" ||
    doc.type === "purchase_title_refused";
  const isStayTax = doc.type === "stay_tax_receipt";

  // Parse structured "Επιπλέον φόροι" (JSON) if present. Only the
  // first row is used for 8.2 (Wrapp expects one accommodation_tax +
  // one other_taxes_percent_category per line).
  let stayTaxRow: { category: string; amount: number } | null = null;
  if (isStayTax && doc.additionalTaxes) {
    try {
      const parsed = JSON.parse(doc.additionalTaxes);
      const first = Array.isArray(parsed?.rows) ? parsed.rows[0] : null;
      if (first && first.category) {
        const amt = Number(String(first.amount).replace(",", "."));
        stayTaxRow = {
          category: String(first.category),
          amount: Number.isFinite(amt) ? amt : 0,
        };
      }
    } catch {
      // additionalTaxes wasn't JSON — user is on the legacy free-text
      // path. Leave stayTaxRow null; the preflight already blocks empty.
    }
  }

  // 9.3 Δελτίο Αποστολής — per Wrapp/AADE spec ALL money-carrier
  // fields must be exactly 0 (net/vat/gross totals at invoice level
  // AND vat_total / subtotal at each line). The document tracks value
  // only for information purposes; the transmitted 9.3 payload is
  // stock-movement metadata, not a monetary transaction.
  const isDeliveryNote =
    doc.type === "delivery_note" || doc.type === "delivery_note_correlated";

  const wrappPayload = {
    invoice_type_code: invoiceTypeCode,
    billing_book_id: book.wrappBookId,
    branch: branch?.wrappBranchId ?? undefined,
    // Payment method rules per 17.x subtype (Wrapp validator, cross-checked
    // against actual rejection messages):
    //   17.1 payroll        → REQUIRED ("Payment Methods is mandatory")
    //   17.2 depreciation   → FORBIDDEN ("Payment Methods is forbidden")
    //   17.3-17.6 settlement → FORBIDDEN ("Payment Methods is forbidden")
    // Everything else keeps the user-picked value.
    payment_method_type:
      doc.type === "depreciation" ||
      doc.type === "income_settlement_accounting" ||
      doc.type === "income_settlement_tax" ||
      doc.type === "expense_settlement_accounting" ||
      doc.type === "expense_settlement_tax"
        ? undefined
        : mapPaymentMethodToWrapp(doc.paymentMethod),
    // Per-type total handling:
    //   9.3 (delivery note): all money fields = 0 (stock movement).
    //   8.2 (stay tax): only other_taxes_amount carries value.
    //   17.x settlement: totals must EQUAL the sum of line nets (which
    //     must be > 0), with vat_total = 0 (κατ. 8 απαλλασσόμενα).
    net_total_amount: isDeliveryNote
      ? 0
      : isStayTax
        ? 0
        : isSettlement
          ? Math.abs(Number(doc.netTotalAmount))
          : wire(Number(doc.netTotalAmount)),
    vat_total_amount: isDeliveryNote || isStayTax || isSettlement
      ? 0
      : wire(Number(doc.vatTotalAmount)),
    total_amount: isDeliveryNote
      ? 0
      : isStayTax
        ? (stayTaxRow?.amount ?? Number(doc.totalAmount))
        : isSettlement
          ? Math.abs(Number(doc.netTotalAmount))
          : wire(Number(doc.totalAmount)),
    payable_total_amount: isDeliveryNote
      ? 0
      : isStayTax
        ? (stayTaxRow?.amount ?? Number(doc.payableTotalAmount))
        : isSettlement
          ? Math.abs(Number(doc.netTotalAmount))
          : wire(Number(doc.payableTotalAmount)),
    other_taxes_amount: isStayTax ? (stayTaxRow?.amount ?? 0) : undefined,
    notes: doc.notes ?? undefined,
    num: reservedNumber ?? undefined,
    counterpart,
    is_delivery_note:
      doc.type === "delivery_note" || doc.type === "delivery_note_correlated"
        ? true
        : undefined,
    delivery_detail: deliveryDetail,
    correlated_invoices: correlatedInvoices,
    currency: isForeign && doc.currency ? doc.currency : undefined,
    exchange_rate:
      isForeign && doc.exchangeRate
        ? Number(doc.exchangeRate)
        : undefined,
    customer_emails: customerEmails,
    email_locale: emailLocale,
    generate_pdf: true,
    invoice_lines: doc.lines.map((l, i) => {
      const net = wire(Number(l.netAmount));
      const vat = wire(Number(l.vatAmount));
      const total = wire(Number(l.totalAmount));

      // ── 8.2 stay-tax special line: matches the Wrapp docs example
      //    exactly — no name/quantity/vat, no classification_type
      //    (Wrapp's own example omits it for 8.2), and money-carriers
      //    accommodation_tax + other_taxes_percent_category +
      //    other_taxes_amount.
      if (isStayTax) {
        return {
          line_number: i + 1,
          accommodation_tax: stayTaxRow?.amount ?? 0,
          other_taxes_percent_category: stayTaxRow?.category ?? "7",
          other_taxes_amount: stayTaxRow?.amount ?? 0,
          classification_category: classification.category, // category1_95
          // classification_type intentionally omitted for 8.2
          classification_type: undefined,
        };
      }

      // myDATA VAT-exemption codes signal the WHY of a 0% line so the
      // AADE validator classifies it under vatCategory 7 (χωρίς ΦΠΑ)
      // instead of category 8 (απαλλασσόμενα). Without this Wrapp
      // rejects intracommunity/third-country docs with
      // "Vat category must have value 7 for this invoice type".
      //   3  = Άρθρο 17 (τόπος παράδοσης αγαθών)
      //   6  = Άρθρο 24 (τρίτες χώρες — exports)
      //   14 = Άρθρο 33 (ενδοκοινοτικές παραδόσεις αγαθών)
      const vatExemptionCode: number | undefined =
        Number(l.vatRate) === 0 || isSettlement
          ? doc.type === "eu_sale_invoice"
            ? 14
            : doc.type === "eu_service_invoice"
              ? 3
              : doc.type === "third_country_sale_invoice" ||
                  doc.type === "third_country_service_invoice"
                ? 6
                : isSettlement
                  ? 15 // Άρθρο 44 - Μικρές επιχειρήσεις. Wrapp
                       // sometimes rejects vatCategory=7 as default
                       // when 17.x lines have vat_rate=0 and no
                       // exemption code — provide 15 explicitly so
                       // the payload maps to vatCategory=8 as the
                       // validator demands.
                  : ZERO_VAT_TYPES.has(doc.type)
                    ? 1 // Άρθρο 2, 3 — fallback
                    : undefined
          : undefined;
      // Name sanitization: Wrapp validator rejects "<", ">", "/" and
      // similar shell/HTML metacharacters ("Το κείμενο περιέχει μη
      // επιτρεπτούς χαρακτήρες"). Strip them from every line name
      // globally so no doc type triggers that error.
      const safeName =
        (l.description ?? "Είδος")
          .replace(/[<>\/\\]/g, "-")
          .trim()
          .slice(0, 200) || "Είδος";
      return {
        line_number: i + 1,
        // 17.x settlement types: name is REQUIRED by the Wrapp
        // validator ("Invoice lines name δεν πρέπει να είναι κενό"),
        // vat_rate is REQUIRED and must be a number (0 = απαλλασσόμενα),
        // but quantity + quantity_type are FORBIDDEN by the myDATA
        // XSD ("MeasurementUnit Per Line is forbidden").
        name: safeName,
        code: undefined,
        description: undefined,
        quantity: isSettlement ? undefined : wire(Number(l.quantity)),
        quantity_type: isSettlement ? undefined : 1,
        // 9.3 delivery notes: ALL money fields = 0 (stock movement,
        // no monetary value).
        // 17.x settlement: net values MUST be > 0 ("NetValue per
        // line ... must have value greater than 0 for this invoice
        // type"), and MUST equal the invoice net. VAT is always 0.
        unit_price: isDeliveryNote
          ? 0
          : isSettlement
            ? Math.abs(Number(l.unitPrice)) || Math.abs(net) || 0
            : wire(Number(l.unitPrice)),
        net_total_price: isDeliveryNote
          ? 0
          : isSettlement
            ? Math.abs(net) || 0
            : net,
        // vat_rate: 9.3 stays at real rate (informational). 17.x = 0
        // (vatCategory 8 = απαλλασσόμενα; Wrapp auto-derives cat 8
        // when vat_rate=0 with no vat_exemption_code set).
        vat_rate: isSettlement ? 0 : Number(l.vatRate),
        vat_total: isSettlement || isDeliveryNote ? 0 : vat,
        // subtotal on 17.x = net (VAT is 0, so gross = net).
        subtotal: isDeliveryNote
          ? 0
          : isSettlement
            ? Math.abs(net) || 0
            : total,
        vat_exemption_code: vatExemptionCode,
        classification_category: classification.category,
        classification_type: classification.type,
        // expense flag:
        //   true  → Wrapp emits under expensesClassifications
        //   false → Wrapp emits under incomeClassifications (needed
        //           for 17.3/17.4 income settlement where Wrapp
        //           otherwise defaults to expense side and rejects
        //           with "incomeClassification is mandatory;
        //           expensesClassification is forbidden")
        //   undefined → Wrapp default (income for most types)
        expense: isExpenseSide
          ? true
          : doc.type === "income_settlement_accounting" ||
              doc.type === "income_settlement_tax"
            ? false
            : undefined,
      };
    }),
  };

  try {
    const res = await getWrappClient().issueInvoice(businessId, wrappPayload);
    const asObj = res as Record<string, unknown>;

    if (typeof asObj.id === "string") {
      // Immediate success — persist Wrapp fields.
      await prisma.document.update({
        where: { id: doc.id },
        data: {
          status: "issued",
          wrappInvoiceId: asObj.id,
          wrappInvoiceUrl:
            typeof asObj.wrapp_invoice_url === "string"
              ? asObj.wrapp_invoice_url
              : null,
          wrappInvoiceUrlEn:
            typeof asObj.wrapp_invoice_url_en === "string"
              ? asObj.wrapp_invoice_url_en
              : null,
          myDataMark:
            typeof asObj.my_data_mark === "string" ? asObj.my_data_mark : null,
          myDataUid:
            typeof asObj.my_data_uid === "string" ? asObj.my_data_uid : null,
          myDataQrUrl:
            typeof asObj.my_data_qr_url === "string" ? asObj.my_data_qr_url : null,
          lastWrappError: null,
        },
      });

      // Auto-payment: retail-style docs (11.x) paid immediately with
      // cash/card/IRIS are settled on the spot at the counter, so record
      // a Payment row automatically. Makes "Εισπράξεις μήνα" on
      // /app/payments reflect POS-style sales without the user having
      // to open the payment modal for every receipt. Only fires on the
      // three retail types + the three genuinely immediate methods.
      const autoPayment = detectAutoPayment(
        doc.type,
        doc.paymentMethod,
      );
      if (autoPayment) {
        const amount = Math.abs(Number(doc.totalAmount));
        if (amount > 0) {
          await prisma.payment.create({
            data: {
              businessId: businessId,
              clientId: doc.clientId,
              documentId: doc.id,
              amount,
              method: autoPayment,
              receivedAt: doc.issueDate,
              notes: "Αυτόματη είσπραξη κατά την έκδοση",
            },
          });
          await prisma.document.update({
            where: { id: doc.id },
            data: { paymentStatus: "paid" },
          });
        }
      }

      await logAudit({
        userId: actorUserId,
        businessId: businessId,
        action: "document.issue.ok",
        entityType: "Document",
        entityId: doc.id,
        meta: { mark: asObj.my_data_mark, wrapp_id: asObj.id },
      });
      return {
        ok: true as const,
        series: reservedSeries,
        number: reservedNumber,
      };
    }

    if (asObj.status === "pending" && typeof asObj.invoice_id === "string") {
      // Wrapp accepted the request but myDATA transmission is queued.
      // Store the wrappInvoiceId now; the webhook (or a poll) will fill MARK.
      await prisma.document.update({
        where: { id: doc.id },
        data: {
          status: "sending",
          wrappInvoiceId: asObj.invoice_id,
          lastWrappError: null,
        },
      });
      return { ok: true as const, series: reservedSeries, number: reservedNumber };
    }

    // Structured error envelope.
    const errors = Array.isArray(asObj.errors) ? asObj.errors : [];
    const rawMessage = errors
      .map((e: Record<string, unknown>) => e.title ?? e.message)
      .filter(Boolean)
      .join("; ")
      .slice(0, 500);
    // Translate to plain Greek AND append the raw English as a
    // diagnostic tail. Users see the friendly text first; support can
    // scan the "[myDATA: …]" suffix on the doc detail page to grab
    // the exact (category, type, invoice_type_code) tuple that
    // failed, so the mapping can be fixed in one shot instead of
    // trial-and-error.
    const compound = withRawTail(translateWrappError(rawMessage), rawMessage);
    throw new WrappApiError(
      compound || "Η Wrapp επέστρεψε σφάλμα.",
      { code: "wrapp.errors", raw: res },
    );
  } catch (err) {
    logger.error("wrapp.issue.failed", err, {
      businessId: businessId,
      userId: actorUserId,
      documentId: doc.id,
      action: "document.issue",
    });
    const rawMessage =
      err instanceof Error ? err.message.slice(0, 500) : "Άγνωστο σφάλμα.";
    // The message thrown above already carries the "[myDATA: …]"
    // suffix. Anything else (raw fetch error, unexpected shape) still
    // gets translated + tailed here.
    const friendly = rawMessage.includes("[myDATA:")
      ? rawMessage
      : withRawTail(translateWrappError(rawMessage), rawMessage);
    await prisma.document
      .update({
        where: { id: doc.id },
        data: { status: "draft", lastWrappError: friendly },
      })
      .catch(() => undefined);

    if (err instanceof NotImplementedInPhase1) {
      return { ok: false as const, error: err.message };
    }
    return { ok: false as const, error: friendly };
  }
}

/**
 * Append the raw Wrapp/myDATA validator text as a diagnostic tail
 * after the translated Greek message. Skipped when the raw is already
 * embedded in the friendly text (translator returned it unchanged
 * because it didn't match any rule) so we don't duplicate.
 */
function withRawTail(friendly: string, raw: string): string {
  const cleanRaw = (raw || "").trim();
  if (!cleanRaw) return friendly;
  if (friendly.includes(cleanRaw)) return friendly;
  return `${friendly}  [myDATA: ${cleanRaw}]`;
}

// ─── Delivery-note (9.3) payload helper ─────────────────────────────────

type IssuerAddress = {
  legalName: string | null;
  addressLine: string | null;
  city: string | null;
  postalCode: string | null;
};

type DispatchInput = {
  dispatchAt: Date | null;
  /** The doc's issueDate — used to clamp dispatch datetime forward so
   * Wrapp doesn't reject with "dispatch time must be >= issue time". */
  issueDate: Date;
  dispatchReason: string | null;
  dispatchPurpose: string | null;
  /** τόπος φόρτωσης — overrides the issuer branch address when set. */
  loadingAddress: string | null;
  destinationAddress: string | null;
  vehicleNumber: string | null;
  driverName: string | null;
  issuerAddress: IssuerAddress | null;
  branchCode: string | null;
  fallbackParseStreet: (raw: string | null | undefined) => {
    street: string;
    number: string;
  };
  fallbackNormalizePostal: (raw: string | null | undefined) => string;
};

/**
 * Compose the `delivery_detail` block Wrapp requires for 9.3 payloads.
 *
 * myDATA rejects NULLs on required fields (dispatch_date, dispatch_time,
 * from_*, to_*, purpose_of_movement, issuer_of_movement, vehicle_number),
 * so every field falls back to a safe placeholder if the user didn't type
 * one. That keeps issuance from blowing up on a mostly-empty draft while
 * still letting the user override every value from the editor.
 *
 * `purpose_of_movement` is a Wrapp free-text code (Πώληση / Δείγματα /
 * Επιστροφή / Άλλο). Since Wrapp accepts arbitrary strings there, we pass
 * the user's dispatchReason straight through and use the "Άλλο" custom
 * title slot to carry dispatchPurpose so both survive the round-trip.
 */
/**
 * Normalize a user-facing "Σκοπός διακίνησης" string to the myDATA
 * integer code the AADE validator expects (1-20, plus 15/16/17/18
 * excluded per Wrapp docs).
 *
 * The DraftEditor's select stores the Greek label (legacy), but Wrapp
 * requires an integer per its "Σκοπός Διακίνησης" table. This function
 * accepts either the integer code (passthrough), an exact Greek label
 * match, or a fuzzy substring — and falls back to 19 (Λοιπές
 * Διακινήσεις) for anything unrecognized so the payload still
 * validates.
 */
function mapDispatchReasonToCode(raw: string | null | undefined): string {
  if (!raw) return "1"; // default: Πώληση
  const trimmed = raw.trim();
  // Already an integer code — passthrough after clamping to valid range.
  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    const allowed = new Set([1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 19, 20]);
    return allowed.has(n) ? String(n) : "19";
  }
  const lower = trimmed.toLowerCase();
  const label = lower.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const map: Array<[RegExp, string]> = [
    [/^πωληση$/i, "1"],
    [/λογαριασμο τριτ/i, "2"],
    [/δειγμ/i, "3"],
    [/εκθεσ/i, "4"],
    [/επιστροφ/i, "5"],
    [/επεξεργ|συναρμολ|αποσυναρμολ/i, "7"],
    [/ενδοδιακιν|μεταξυ εγκαταστ/i, "8"],
    [/αγορ/i, "9"],
    [/εφοδιασμ|πλοι|αεροσκα/i, "10"],
    [/δωρεαν/i, "11"],
    [/εγγυησ/i, "12"],
    [/χρησιδανε/i, "13"],
    [/αποθηκευσ.*τριτ/i, "14"],
    [/λοιπ|αλλο/i, "19"],
    [/μεταφορ|ταχυμετ/i, "20"],
  ];
  for (const [re, code] of map) {
    if (re.test(label)) return code;
  }
  // Unknown free-text — bucket as "Λοιπές Διακινήσεις" so the payload
  // still validates. The original string travels via custom_title.
  return "19";
}

function buildDeliveryDetail(input: DispatchInput) {
  // Defensive auto-bump: myDATA rejects dispatch_time < invoice_issue_time,
  // and race conditions in the UI (draft created "now", dispatch time
  // auto-set to "now" with minute-level precision but issueDate stored
  // with second-level precision) meant the two could disagree by a few
  // seconds and Wrapp would refuse the payload. Silently clamp the
  // dispatch datetime forward to the issue datetime + 1 minute so the
  // ordering is always valid on the wire.
  const requested = input.dispatchAt ?? new Date();
  const minAllowed = input.issueDate
    ? new Date(input.issueDate.getTime() + 60_000)
    : requested;
  const now = requested.getTime() < minAllowed.getTime() ? minAllowed : requested;

  // Wrapp docs specify format "DD-MM-YYYY" for dispatch_date (e.g.
  // "21-03-2025") and "HH:MM" for dispatch_time. Toolkit ISO output
  // (YYYY-MM-DD) worked historically because Wrapp was lenient, but
  // we now match the documented format exactly.
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = now.getUTCFullYear();
  const dispatchDate = `${dd}-${mm}-${yyyy}`;
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mi = String(now.getUTCMinutes()).padStart(2, "0");
  const dispatchTime = `${hh}:${mi}`;

  // τόπος φόρτωσης — explicit user input wins over the branch address,
  // so 9.3 payloads reflect the ACTUAL loading point when it differs
  // from the issuer's registered address (warehouse dispatch, third-
  // party fulfillment, etc.).
  const fromRaw =
    input.loadingAddress?.trim() || input.issuerAddress?.addressLine || null;
  const fromStreet = input.fallbackParseStreet(fromRaw);
  const toStreet = input.fallbackParseStreet(input.destinationAddress);

  return {
    dispatch_date: dispatchDate,
    dispatch_time: dispatchTime,
    vehicle_number: (input.vehicleNumber || "-").slice(0, 40),
    // myDATA validator requires an integer 1-20 (from the AADE
    // "Σκοπός Διακίνησης" table), not the Greek label. Users pick
    // a Greek dropdown value in the UI — we normalize it back to
    // the myDATA code here. Unknown/free-text falls back to 19
    // ("Λοιπές Διακινήσεις") + carries the raw label as the custom
    // title so the meaning survives in the AADE payload.
    purpose_of_movement: mapDispatchReasonToCode(input.dispatchReason),
    purpose_of_movement_custom_title:
      mapDispatchReasonToCode(input.dispatchReason) === "19"
        ? (input.dispatchPurpose || input.dispatchReason || "").slice(0, 200) ||
          undefined
        : input.dispatchPurpose
          ? input.dispatchPurpose.slice(0, 200)
          : undefined,
    issuer_of_movement: (
      input.driverName ||
      input.issuerAddress?.legalName ||
      "Εκδότης"
    ).slice(0, 160),
    from_address: fromStreet.street,
    from_number: fromStreet.number,
    from_city: (input.issuerAddress?.city || "-").slice(0, 80),
    from_zipcode: input.fallbackNormalizePostal(input.issuerAddress?.postalCode),
    from_branch: input.branchCode ?? undefined,
    to_address: toStreet.street,
    to_number: toStreet.number,
    to_city: "-",
    to_zipcode: "00000",
  };
}

// ─── Auto-payment detection for retail issuance ─────────────────────────
//
// Retail-style docs (11.1 / 11.2 / 11.3) settled at the counter with
// cash / card / IRIS get an automatic Payment row on issuance so the user
// doesn't have to open a modal for every receipt. Bank transfer, cheque,
// and επί πιστώσει are excluded — those settle after the fact.
//
// paymentMethod on Document is stored as the free-form Greek label the
// user picked in the dropdown (there's no enum coercion on the column),
// so we match by substring. Return null when the combination isn't a
// safe auto-payment candidate — the caller skips the insert entirely.
function detectAutoPayment(
  type: DocumentType,
  paymentMethod: string | null | undefined,
): "cash" | "card" | "iris" | null {
  const isRetailType =
    type === "retail_receipt" ||
    type === "service_receipt" ||
    type === "simplified_invoice";
  if (!isRetailType) return null;
  if (!paymentMethod) return null;
  const raw = paymentMethod.toLowerCase();
  if (raw.includes("μετρητ") || raw === "cash") return "cash";
  if (raw.includes("κάρτα") || raw.includes("καρτα") || raw === "card")
    return "card";
  if (raw === "iris" || raw.includes("iris")) return "iris";
  return null;
}
