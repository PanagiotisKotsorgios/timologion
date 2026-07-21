"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma, type DocumentType, type RecurrenceCadence } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { formatZodError } from "@/lib/zod-el";
import { computeLine, computeDocument } from "@/lib/totals";

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

const CADENCES = ["weekly", "monthly", "quarterly", "yearly"] as const;

const lineSchema = z.object({
  itemId: z.string().optional().or(z.literal("")),
  description: z.string().min(1).max(255),
  quantity: z.coerce.number().gt(0),
  unit: z.string().max(20).default("τμχ"),
  unitPrice: z.coerce.number().min(0),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  vatRate: z.coerce.number().min(0).max(100).default(24),
});

const schema = z.object({
  id: z.string().optional().or(z.literal("")),
  label: z.string().min(2).max(160),
  clientId: z.string().min(1),
  type: z.enum(DOC_TYPES),
  cadence: z.enum(CADENCES),
  billingBookId: z.string().optional().or(z.literal("")),
  branchId: z.string().optional().or(z.literal("")),
  paymentMethod: z.string().max(80).optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
  nextRunAt: z.string().min(1),
  status: z.enum(["active", "paused"]).default("active"),
  lines: z.array(lineSchema).min(1),
});

export type RecurringInput = z.infer<typeof schema>;
export type RecurringFormState = { error?: string } | undefined;

function addByCadence(from: Date, cadence: RecurrenceCadence): Date {
  const d = new Date(from);
  if (cadence === "weekly") d.setDate(d.getDate() + 7);
  else if (cadence === "monthly") d.setMonth(d.getMonth() + 1);
  else if (cadence === "quarterly") d.setMonth(d.getMonth() + 3);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
}

export async function saveRecurringAction(
  input: RecurringInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

  const data = {
    businessId: ctx.businessId,
    clientId: parsed.data.clientId,
    billingBookId: parsed.data.billingBookId || null,
    branchId: parsed.data.branchId || null,
    type: parsed.data.type as DocumentType,
    label: parsed.data.label,
    cadence: parsed.data.cadence as RecurrenceCadence,
    status: parsed.data.status,
    nextRunAt: new Date(parsed.data.nextRunAt),
    paymentMethod: parsed.data.paymentMethod || null,
    notes: parsed.data.notes || null,
    linesJson: JSON.stringify(parsed.data.lines),
  };

  let saved: { id: string };
  if (parsed.data.id) {
    saved = await prisma.recurringDocument.update({
      where: { id: parsed.data.id },
      data,
      select: { id: true },
    });
  } else {
    saved = await prisma.recurringDocument.create({
      data,
      select: { id: true },
    });
  }

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: parsed.data.id ? "recurring.update" : "recurring.create",
    entityType: "RecurringDocument",
    entityId: saved.id,
  });

  revalidatePath("/app/documents/repeating");
  return { ok: true, id: saved.id };
}

export async function toggleRecurringStatusAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");
  const id = String(formData.get("id") ?? "");
  const rec = await prisma.recurringDocument.findFirst({
    where: { id, businessId: ctx.businessId },
  });
  if (!rec) return;
  const nextStatus = rec.status === "active" ? "paused" : "active";
  await prisma.recurringDocument.update({
    where: { id: rec.id },
    data: { status: nextStatus },
  });
  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "recurring.toggle",
    entityType: "RecurringDocument",
    entityId: id,
    meta: { to: nextStatus },
  });
  revalidatePath("/app/documents/repeating");
}

export async function deleteRecurringAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");
  const id = String(formData.get("id") ?? "");
  await prisma.recurringDocument.deleteMany({
    where: { id, businessId: ctx.businessId },
  });
  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "recurring.delete",
    entityType: "RecurringDocument",
    entityId: id,
  });
  revalidatePath("/app/documents/repeating");
}

/**
 * Materialize a single RecurringDocument into a new draft Document. Advances
 * `nextRunAt` by its cadence and stamps `lastRunAt`.
 */
export async function generateFromRecurringAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");
  const id = String(formData.get("id") ?? "");
  const rec = await prisma.recurringDocument.findFirst({
    where: { id, businessId: ctx.businessId },
    include: { billingBook: true },
  });
  if (!rec) return;

  const lines = JSON.parse(rec.linesJson) as z.infer<typeof lineSchema>[];
  const totals = computeDocument(lines);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    let series = rec.billingBook?.series ?? null;
    let billingBookId = rec.billingBookId;
    if (rec.billingBookId) {
      const book = await tx.billingBook.findUnique({
        where: { id: rec.billingBookId },
      });
      if (book) {
        series = book.series;
        billingBookId = book.id;
      }
    }

    const doc = await tx.document.create({
      data: {
        businessId: ctx.businessId,
        clientId: rec.clientId,
        branchId: rec.branchId,
        billingBookId,
        type: rec.type,
        status: "draft",
        series,
        issueDate: now,
        paymentMethod: rec.paymentMethod,
        notes: rec.notes,
        netTotalAmount: totals.netTotal,
        vatTotalAmount: totals.vatTotal,
        totalAmount: totals.total,
        payableTotalAmount: totals.total,
      },
    });

    await tx.documentLine.createMany({
      data: lines.map((line, i) => {
        const t = computeLine(line);
        return {
          documentId: doc.id,
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

    await tx.recurringDocument.update({
      where: { id: rec.id },
      data: {
        lastRunAt: now,
        nextRunAt: addByCadence(now, rec.cadence),
      },
    });
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "recurring.generate",
    entityType: "RecurringDocument",
    entityId: id,
  });

  revalidatePath("/app/documents/repeating");
  revalidatePath("/app/documents");
}
