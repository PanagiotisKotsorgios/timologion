"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { formatZodError } from "@/lib/zod-el";

function o(v: string | undefined | null): string | null {
  return v && v.length > 0 ? v : null;
}

const upsertSchema = z
  .object({
    id: z.string().optional().or(z.literal("")),
    staffUserId: z.string().optional().or(z.literal("")),
    clientId: z.string().optional().or(z.literal("")),
    itemId: z.string().optional().or(z.literal("")),
    serviceName: z.string().min(1).max(200),
    startAt: z.string().min(1),
    endAt: z.string().min(1),
    priceOverride: z.string().optional().or(z.literal("")),
    vatRate: z.string().optional().or(z.literal("")),
    notes: z.string().max(5000).optional().or(z.literal("")),
  })
  .refine(
    (v) => {
      const s = new Date(v.startAt);
      const e = new Date(v.endAt);
      return e.getTime() > s.getTime();
    },
    { message: "Η λήξη πρέπει να είναι μετά την έναρξη.", path: ["endAt"] },
  );

export type AppointmentFormState = { error?: string } | undefined;

export async function saveAppointmentAction(
  _prev: AppointmentFormState,
  formData: FormData,
): Promise<AppointmentFormState> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:write");

  const parsed = upsertSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  const {
    id,
    staffUserId,
    clientId,
    itemId,
    serviceName,
    startAt,
    endAt,
    priceOverride,
    vatRate,
    notes,
  } = parsed.data;

  const data = {
    businessId: ctx.businessId,
    staffUserId: o(staffUserId),
    clientId: o(clientId),
    itemId: o(itemId),
    serviceName: serviceName.trim(),
    startAt: new Date(startAt),
    endAt: new Date(endAt),
    priceOverride: priceOverride ? Number(priceOverride) : null,
    vatRate: vatRate ? Number(vatRate) : null,
    notes: o(notes),
  };

  if (id) {
    const existing = await prisma.appointment.findFirst({
      where: { id, businessId: ctx.businessId },
      select: { id: true },
    });
    if (!existing) return { error: "Το ραντεβού δεν βρέθηκε." };
    await prisma.appointment.update({ where: { id }, data });
    await logAudit({
      userId: ctx.userId,
      businessId: ctx.businessId,
      action: "appointment.update",
      entityType: "Appointment",
      entityId: id,
    });
    revalidatePath("/app/appointments");
    return undefined;
  }

  const created = await prisma.appointment.create({ data });
  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "appointment.create",
    entityType: "Appointment",
    entityId: created.id,
  });
  revalidatePath("/app/appointments");
  return undefined;
}

export async function updateAppointmentStatusAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:write");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as AppointmentStatus;
  if (!id) return;
  const ok = ["scheduled", "completed", "cancelled", "no_show"] as const;
  if (!ok.includes(status as (typeof ok)[number])) return;

  await prisma.appointment.updateMany({
    where: { id, businessId: ctx.businessId },
    data: { status },
  });
  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "appointment.status",
    entityType: "Appointment",
    entityId: id,
    meta: { status },
  });
  revalidatePath("/app/appointments");
}

export async function deleteAppointmentAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:write");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.appointment.deleteMany({
    where: { id, businessId: ctx.businessId },
  });
  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "appointment.delete",
    entityType: "Appointment",
    entityId: id,
  });
  revalidatePath("/app/appointments");
}

/**
 * One-click: create a Document draft from the appointment, mark the
 * appointment as completed, and redirect the user to the draft so they
 * can review before issuing through Wrapp. Idempotent — if we've
 * already converted, we jump straight to the existing draft.
 */
export async function convertAppointmentToDocumentAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const appointment = await prisma.appointment.findFirst({
    where: { id, businessId: ctx.businessId },
    include: { item: true, client: true },
  });
  if (!appointment) return;

  if (appointment.convertedDocumentId) {
    // Already converted — reuse the existing draft.
    const existing = await prisma.document.findFirst({
      where: { id: appointment.convertedDocumentId, businessId: ctx.businessId },
      select: { id: true },
    });
    if (existing) redirect(`/app/documents/${existing.id}/edit`);
  }

  const unitPrice =
    appointment.priceOverride != null
      ? Number(appointment.priceOverride)
      : appointment.item
        ? Number(appointment.item.defaultPrice)
        : 0;
  const vatRate =
    appointment.vatRate != null
      ? Number(appointment.vatRate)
      : appointment.item
        ? Number(appointment.item.vatRate)
        : 24;

  const net = unitPrice;
  const vat = Math.round(((net * vatRate) / 100) * 100) / 100;
  const total = Math.round((net + vat) * 100) / 100;

  const draft = await prisma.$transaction(async (tx) => {
    const doc = await tx.document.create({
      data: {
        businessId: ctx.businessId,
        clientId: appointment.clientId,
        type: "service_invoice",
        status: "draft",
        issueDate: new Date(),
        netTotalAmount: net,
        vatTotalAmount: vat,
        totalAmount: total,
        payableTotalAmount: total,
        notes:
          `Από ραντεβού ${appointment.startAt.toLocaleString("el-GR")}` +
          (appointment.notes ? `\n${appointment.notes}` : ""),
      },
    });
    await tx.documentLine.create({
      data: {
        documentId: doc.id,
        itemId: appointment.itemId,
        ordinal: 0,
        description: appointment.serviceName,
        quantity: 1,
        unit: appointment.item?.unit ?? "τμχ",
        unitPrice,
        discountPct: 0,
        vatRate,
        netAmount: net,
        vatAmount: vat,
        totalAmount: total,
      },
    });
    await tx.appointment.update({
      where: { id: appointment.id },
      data: {
        convertedDocumentId: doc.id,
        status: "completed",
      },
    });
    return doc;
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "appointment.convert",
    entityType: "Appointment",
    entityId: appointment.id,
    meta: { documentId: draft.id },
  });

  revalidatePath("/app/appointments");
  redirect(`/app/documents/${draft.id}/edit`);
}
