"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma, type PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { formatZodError } from "@/lib/zod-el";

const METHODS = [
  "cash",
  "card",
  "bank_transfer",
  "iris",
  "check",
  "credit",
  "other",
] as const;

const paymentSchema = z.object({
  documentId: z.string().optional().or(z.literal("")),
  clientId: z.string().optional().or(z.literal("")),
  amount: z.coerce.number().gt(0),
  method: z.enum(METHODS).default("cash"),
  reference: z.string().max(160).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  receivedAt: z.string().optional().or(z.literal("")),
});

export type PaymentFormState = { error?: string } | undefined;

/**
 * Record a payment. If tied to a document, updates that document's
 * paymentStatus (paid / partial / unpaid) based on the total amount paid so
 * far vs. document total.
 */
export async function recordPaymentAction(
  _prev: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");
  const parsed = paymentSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  const documentId = parsed.data.documentId || null;
  let clientId = parsed.data.clientId || null;

  // If a documentId is set, sanity-check tenant ownership + inherit clientId.
  let doc: {
    id: string;
    clientId: string | null;
    totalAmount: Prisma.Decimal;
  } | null = null;
  if (documentId) {
    doc = await prisma.document.findFirst({
      where: { id: documentId, businessId: ctx.businessId },
      select: { id: true, clientId: true, totalAmount: true },
    });
    if (!doc) return { error: "Το παραστατικό δεν βρέθηκε." };
    if (!clientId) clientId = doc.clientId;
  }

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        businessId: ctx.businessId,
        documentId,
        clientId,
        amount: parsed.data.amount,
        method: parsed.data.method as PaymentMethod,
        reference: parsed.data.reference || null,
        notes: parsed.data.notes || null,
        receivedAt: parsed.data.receivedAt
          ? new Date(parsed.data.receivedAt)
          : new Date(),
      },
    });

    if (doc) {
      const agg = await tx.payment.aggregate({
        where: { documentId: doc.id },
        _sum: { amount: true },
      });
      const total = Number(doc.totalAmount);
      const paid = Number(agg._sum.amount ?? 0);
      const status =
        paid <= 0 ? "unpaid" : paid + 0.001 < total ? "partial" : "paid";
      await tx.document.update({
        where: { id: doc.id },
        data: { paymentStatus: status },
      });
    }
    return created;
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "payment.record",
    entityType: "Payment",
    entityId: payment.id,
    meta: { amount: parsed.data.amount, method: parsed.data.method },
  });

  revalidatePath("/app/payments");
  if (documentId) revalidatePath(`/app/documents/${documentId}`);
  if (clientId) revalidatePath(`/app/clients/${clientId}`);
  return undefined;
}

export async function markDocumentPaidAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");
  const documentId = String(formData.get("documentId") ?? "");
  if (!documentId) return;

  const doc = await prisma.document.findFirst({
    where: { id: documentId, businessId: ctx.businessId },
    select: { id: true, clientId: true, totalAmount: true, paymentStatus: true },
  });
  if (!doc) return;

  const agg = await prisma.payment.aggregate({
    where: { documentId },
    _sum: { amount: true },
  });
  const alreadyPaid = Number(agg._sum.amount ?? 0);
  const outstanding = Math.max(0, Number(doc.totalAmount) - alreadyPaid);

  if (outstanding > 0.001) {
    await prisma.payment.create({
      data: {
        businessId: ctx.businessId,
        documentId,
        clientId: doc.clientId,
        amount: outstanding,
        method: "cash",
        notes: "Σήμανση ως εξοφλημένο",
      },
    });
  }

  await prisma.document.update({
    where: { id: documentId },
    data: { paymentStatus: "paid" },
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "document.mark_paid",
    entityType: "Document",
    entityId: documentId,
  });

  revalidatePath(`/app/documents/${documentId}`);
  revalidatePath("/app/payments");
}

export async function deletePaymentAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const payment = await prisma.payment.findFirst({
    where: { id, businessId: ctx.businessId },
    select: { id: true, documentId: true, clientId: true },
  });
  if (!payment) return;

  await prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id: payment.id } });
    if (payment.documentId) {
      const doc = await tx.document.findUnique({
        where: { id: payment.documentId },
        select: { totalAmount: true },
      });
      if (doc) {
        const agg = await tx.payment.aggregate({
          where: { documentId: payment.documentId },
          _sum: { amount: true },
        });
        const paid = Number(agg._sum.amount ?? 0);
        const total = Number(doc.totalAmount);
        const status =
          paid <= 0 ? "unpaid" : paid + 0.001 < total ? "partial" : "paid";
        await tx.document.update({
          where: { id: payment.documentId },
          data: { paymentStatus: status },
        });
      }
    }
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "payment.delete",
    entityType: "Payment",
    entityId: id,
  });

  revalidatePath("/app/payments");
  if (payment.documentId) revalidatePath(`/app/documents/${payment.documentId}`);
}
