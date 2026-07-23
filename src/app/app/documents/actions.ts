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
import { reserveNextNumber } from "@/lib/numbering";
import { logger } from "@/lib/logger";
import { checkDocumentQuota } from "@/lib/quota";

const DOCUMENT_TYPES = [
  "invoice",
  "service_invoice",
  "retail_receipt",
  "service_receipt",
  "credit_note",
  "proforma",
  "quote",
  "order",
  "delivery_note",
] as const;

const lineSchema = z.object({
  itemId: z.string().optional().or(z.literal("")),
  description: z.string().min(1).max(255),
  quantity: z.coerce.number().gt(0),
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
});

export type DraftFormState = { error?: string } | undefined;

export type DraftInput = z.infer<typeof draftSchema>;

export async function createDraftAction(
  input: DraftInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");

  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: formatZodError(parsed.error) };
  }

  const totals = computeDocument(parsed.data.lines);

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
        type: parsed.data.type,
        status: "draft",
        series,
        issueDate: new Date(parsed.data.issueDate),
        deliveryNoteRef: parsed.data.deliveryNoteRef || null,
        paymentMethod: parsed.data.paymentMethod || null,
        printLanguage: parsed.data.printLanguage,
        additionalTaxes: parsed.data.additionalTaxes || null,
        notes: parsed.data.notes || null,
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

  const copy = await prisma.$transaction(async (tx) => {
    const d = await tx.document.create({
      data: {
        businessId: ctx.businessId,
        clientId: src.clientId,
        branchId: src.branchId,
        type: src.type,
        status: "draft",
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
 * Create a credit note draft against an existing issued document. Copies the
 * client and lines, sets type=credit_note and quantities negative so totals
 * reverse the original.
 */
export async function issueCreditNoteAction(
  documentId: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
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

  const totals = { net: 0, vat: 0, tot: 0 };
  const credit = await prisma.$transaction(async (tx) => {
    const d = await tx.document.create({
      data: {
        businessId: ctx.businessId,
        clientId: src.clientId,
        branchId: src.branchId,
        type: "credit_note",
        status: "draft",
        issueDate: new Date(),
        printLanguage: src.printLanguage,
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
        return {
          documentId: d.id,
          itemId: l.itemId,
          ordinal: i,
          description: `Πιστωτικό: ${l.description}`,
          quantity: l.quantity.negated(),
          unit: l.unit,
          unitPrice: l.unitPrice,
          discountPct: l.discountPct,
          vatRate: l.vatRate,
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
    meta: { sourceId: documentId },
  });

  revalidatePath("/app/documents");
  return { ok: true, id: credit.id };
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

export async function attemptIssueAction(documentId: string) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:issue");

  const doc = await prisma.document.findFirst({
    where: { id: documentId, businessId: ctx.businessId },
    include: { client: true, lines: true },
  });
  if (!doc) return { ok: false as const, error: "Το παραστατικό δεν βρέθηκε." };
  if (doc.status !== "draft")
    return { ok: false as const, error: "Μόνο πρόχειρα μπορούν να εκδοθούν." };

  const wrapp = await prisma.wrappConnection.findUnique({
    where: { businessId: ctx.businessId },
  });

  if (!wrapp || wrapp.status !== "active" || !wrapp.canIssueInvoice) {
    return {
      ok: false as const,
      error:
        "Δεν έχει ολοκληρωθεί η ενεργοποίηση της υπηρεσίας ηλεκτρονικής έκδοσης. Ολοκλήρωσε τη σύνδεση με τον πάροχο για να ξεκινήσεις.",
    };
  }

  // Plan quota gate — blocks issue if the tenant has hit its monthly limit.
  const quota = await checkDocumentQuota(ctx.businessId);
  if (!quota.ok) {
    return { ok: false as const, error: quota.error };
  }

  // Reserve the next number atomically from the billing book. Runs in its own
  // transaction so the number is committed even if the Wrapp call fails —
  // a small numbering gap is preferable to duplicate numbers under concurrency.
  let reservedSeries: string | null = doc.series;
  let reservedNumber: number | null = doc.number;
  if (doc.billingBookId && doc.number == null) {
    const bookId = doc.billingBookId;
    const reservation = await prisma.$transaction(async (tx) => {
      return reserveNextNumber(tx, bookId, ctx.businessId);
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

  if (!doc.billingBookId) {
    await prisma.document
      .update({ where: { id: doc.id }, data: { status: "draft" } })
      .catch(() => undefined);
    return {
      ok: false as const,
      error: "Λείπει σειρά παραστατικών (billing book). Συμπλήρωσε πριν την έκδοση.",
    };
  }

  const book = await prisma.billingBook.findFirst({
    where: { id: doc.billingBookId, businessId: ctx.businessId },
    select: { wrappBookId: true },
  });
  if (!book?.wrappBookId) {
    await prisma.document
      .update({ where: { id: doc.id }, data: { status: "draft" } })
      .catch(() => undefined);
    return {
      ok: false as const,
      error:
        "Η σειρά παραστατικών δεν είναι συγχρονισμένη με τη Wrapp. Συγχρόνισε από τις Ρυθμίσεις.",
    };
  }

  const branch = doc.branchId
    ? await prisma.branch.findUnique({
        where: { id: doc.branchId },
        select: { wrappBranchId: true },
      })
    : null;

  const classification = classificationFor(doc.type);

  const wrappPayload = {
    invoice_type_code: invoiceTypeCode,
    billing_book_id: book.wrappBookId,
    branch: branch?.wrappBranchId ?? undefined,
    payment_method_type: mapPaymentMethodToWrapp(
      doc.paymentMethod as
        | "cash"
        | "card"
        | "bank_transfer"
        | "iris"
        | "check"
        | "credit"
        | "other"
        | null,
    ),
    net_total_amount: Number(doc.netTotalAmount),
    vat_total_amount: Number(doc.vatTotalAmount),
    total_amount: Number(doc.totalAmount),
    payable_total_amount: Number(doc.payableTotalAmount),
    notes: doc.notes ?? undefined,
    num: reservedNumber ?? undefined,
    counterpart: doc.client
      ? {
          name: doc.client.legalName,
          country_code: doc.client.country ?? "GR",
          vat: doc.client.vatNumber ?? undefined,
          city: doc.client.city ?? undefined,
          street: doc.client.addressLine ?? undefined,
          number: undefined,
          postal_code: doc.client.postalCode ?? undefined,
          email: doc.client.email ?? undefined,
        }
      : undefined,
    invoice_lines: doc.lines.map((l, i) => {
      const net = Number(l.netAmount);
      const vat = Number(l.vatAmount);
      const total = Number(l.totalAmount);
      return {
        line_number: i + 1,
        name: l.description.slice(0, 200),
        code: undefined,
        description: undefined,
        quantity: Number(l.quantity),
        quantity_type: 1,
        unit_price: Number(l.unitPrice),
        net_total_price: net,
        vat_rate: Number(l.vatRate),
        vat_total: vat,
        subtotal: total,
        classification_category: classification.category,
        classification_type: classification.type,
      };
    }),
  };

  try {
    const res = await getWrappClient().issueInvoice(ctx.businessId, wrappPayload);
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
      await logAudit({
        userId: ctx.userId,
        businessId: ctx.businessId,
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
    const message = errors
      .map((e: Record<string, unknown>) => e.title ?? e.message)
      .filter(Boolean)
      .join("; ")
      .slice(0, 500);
    throw new WrappApiError(message || "Η Wrapp επέστρεψε σφάλμα.", {
      code: "wrapp.errors",
      raw: res,
    });
  } catch (err) {
    logger.error("wrapp.issue.failed", err, {
      businessId: ctx.businessId,
      userId: ctx.userId,
      documentId: doc.id,
      action: "document.issue",
    });
    const message =
      err instanceof Error ? err.message.slice(0, 500) : "Άγνωστο σφάλμα.";
    await prisma.document
      .update({
        where: { id: doc.id },
        data: { status: "draft", lastWrappError: message },
      })
      .catch(() => undefined);

    if (err instanceof NotImplementedInPhase1) {
      return { ok: false as const, error: err.message };
    }
    return { ok: false as const, error: message };
  }
}
