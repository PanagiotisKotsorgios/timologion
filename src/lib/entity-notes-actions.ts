"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { formatZodError } from "@/lib/zod-el";

const addSchema = z.object({
  entityType: z.string().min(1).max(60),
  entityId: z.string().min(1).max(191),
  body: z.string().min(1).max(20_000),
});

const ROUTE_FOR: Record<string, (id: string) => string> = {
  User: (id) => `/admin/users/${id}`,
  SupportTicket: (id) => `/admin/tickets/${id}`,
  Document: (id) => `/admin/documents`,
  Business: (id) => `/admin/businesses/${id}`,
};

export async function addEntityNoteAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdmin("super_admin", "support");
  const parsed = addSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

  await prisma.entityNote.create({
    data: {
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      authorId: ctx.userId,
      body: parsed.data.body,
    },
  });

  await logAudit({
    userId: ctx.userId,
    action: "admin.entity_note.create",
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
  });

  const route = ROUTE_FOR[parsed.data.entityType]?.(parsed.data.entityId);
  if (route) revalidatePath(route);
  return { ok: true };
}

const delSchema = z.object({
  id: z.string().min(1),
  entityType: z.string().min(1).max(60),
  entityId: z.string().min(1).max(191),
});

export async function deleteEntityNoteAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin", "support");
  const parsed = delSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  await prisma.entityNote.delete({ where: { id: parsed.data.id } });

  await logAudit({
    userId: ctx.userId,
    action: "admin.entity_note.delete",
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
  });

  const route = ROUTE_FOR[parsed.data.entityType]?.(parsed.data.entityId);
  if (route) revalidatePath(route);
}
