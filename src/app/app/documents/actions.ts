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
import { NotImplementedInPhase1, getWrappClient } from "@/lib/wrapp/client";
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

  try {
    await getWrappClient().issueInvoice(ctx.businessId, {
      type: doc.type,
      series: reservedSeries ?? "A",
      client: {
        vat: doc.client?.vatNumber ?? undefined,
        legal_name: doc.client?.legalName ?? "Λιανική",
        country_code: "EL",
        address: doc.client?.addressLine ?? undefined,
      },
      issue_date: doc.issueDate.toISOString(),
      idempotency_key: doc.id,
      lines: doc.lines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unit_price: Number(l.unitPrice),
        vat_rate: Number(l.vatRate),
        discount_pct: Number(l.discountPct),
      })),
    });
    return { ok: true as const, series: reservedSeries, number: reservedNumber };
  } catch (err) {
    logger.error("wrapp.issue.failed", err, {
      businessId: ctx.businessId,
      userId: ctx.userId,
      documentId: doc.id,
      action: "document.issue",
    });
    // Wrapp failure: keep the reserved number (gaps < duplicates) but flip
    // the doc back to draft so the user can retry. Log the last error.
    await prisma.document
      .update({
        where: { id: doc.id },
        data: {
          status: "draft",
          lastWrappError:
            err instanceof Error ? err.message.slice(0, 500) : "Άγνωστο σφάλμα.",
        },
      })
      .catch(() => undefined);

    if (err instanceof NotImplementedInPhase1) {
      return { ok: false as const, error: err.message };
    }
    throw err;
  }
}
