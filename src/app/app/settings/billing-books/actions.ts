"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { formatZodError } from "@/lib/zod-el";

const DOC_TYPES = [
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

const schema = z.object({
  id: z.string().optional().or(z.literal("")),
  documentType: z.enum(DOC_TYPES),
  series: z.string().min(1).max(20),
  label: z.string().max(120).optional().or(z.literal("")),
  branchId: z.string().optional().or(z.literal("")),
  nextNumber: z.coerce.number().int().min(1).default(1),
  isDefault: z.string().optional(),
});

export type BillingBookFormState =
  | { error?: string; success?: string }
  | undefined;

const o = (v: string | undefined) => (v && v.length > 0 ? v : null);

export async function saveBillingBookAction(
  _prev: BillingBookFormState,
  formData: FormData,
): Promise<BillingBookFormState> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "business:update");

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  const data = {
    businessId: ctx.businessId,
    documentType: parsed.data.documentType,
    series: parsed.data.series.toUpperCase().replace(/\s+/g, ""),
    label: o(parsed.data.label),
    branchId: o(parsed.data.branchId),
    nextNumber: parsed.data.nextNumber,
    isDefault: parsed.data.isDefault === "on",
  };

  try {
    await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.billingBook.updateMany({
          where: {
            businessId: ctx.businessId,
            documentType: data.documentType,
            isDefault: true,
          },
          data: { isDefault: false },
        });
      }
      if (parsed.data.id) {
        await tx.billingBook.updateMany({
          where: { id: parsed.data.id, businessId: ctx.businessId },
          data,
        });
      } else {
        await tx.billingBook.create({ data });
      }
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return {
        error: "Υπάρχει ήδη σειρά με αυτόν τον κωδικό για τον συγκεκριμένο τύπο.",
      };
    }
    throw err;
  }

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: parsed.data.id ? "billing_book.update" : "billing_book.create",
    entityType: "BillingBook",
    entityId: parsed.data.id || undefined,
    meta: { documentType: data.documentType, series: data.series },
  });

  revalidatePath("/app/settings/billing-books");
  return { success: parsed.data.id ? "Ενημερώθηκε." : "Δημιουργήθηκε." };
}

export async function deleteBillingBookAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "business:update");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.billingBook.deleteMany({
    where: { id, businessId: ctx.businessId },
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "billing_book.delete",
    entityType: "BillingBook",
    entityId: id,
  });

  revalidatePath("/app/settings/billing-books");
}

/**
 * Reserve the next number in a billing book atomically. Used by document
 * issuance (Phase 2+); safe to call in a transaction alongside the document
 * insert.
 */
export async function reserveNextNumber(
  tx: Prisma.TransactionClient,
  bookId: string,
): Promise<number> {
  const book = await tx.billingBook.update({
    where: { id: bookId },
    data: { nextNumber: { increment: 1 } },
    select: { nextNumber: true },
  });
  return book.nextNumber - 1;
}
