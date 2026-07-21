"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { formatZodError } from "@/lib/zod-el";

const tagSchema = z.object({
  label: z.string().min(1).max(60),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#334155"),
});

export async function createTagAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:write");
  const parsed = tagSchema.safeParse({
    label: formData.get("label"),
    color: formData.get("color") || "#334155",
  });
  if (!parsed.success) return { ok: false as const, error: formatZodError(parsed.error) };

  const existing = await prisma.tag.findUnique({
    where: {
      businessId_label: {
        businessId: ctx.businessId,
        label: parsed.data.label,
      },
    },
  });
  if (existing) return { ok: true as const, id: existing.id };

  const tag = await prisma.tag.create({
    data: {
      businessId: ctx.businessId,
      label: parsed.data.label,
      color: parsed.data.color,
    },
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "tag.create",
    entityType: "Tag",
    entityId: tag.id,
  });

  revalidatePath("/app/clients");
  return { ok: true as const, id: tag.id };
}

export async function deleteTagAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:write");
  const id = String(formData.get("id") ?? "");
  await prisma.tag.deleteMany({ where: { id, businessId: ctx.businessId } });
  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "tag.delete",
    entityType: "Tag",
    entityId: id,
  });
  revalidatePath("/app/clients");
}

export async function setClientTagsAction(
  clientId: string,
  tagIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:write");

  const client = await prisma.client.findFirst({
    where: { id: clientId, businessId: ctx.businessId },
    select: { id: true },
  });
  if (!client) return { ok: false, error: "Ο πελάτης δεν βρέθηκε." };

  const validTags = await prisma.tag.findMany({
    where: { businessId: ctx.businessId, id: { in: tagIds } },
    select: { id: true },
  });
  const validIds = new Set(validTags.map((t) => t.id));

  await prisma.$transaction([
    prisma.clientTag.deleteMany({ where: { clientId } }),
    prisma.clientTag.createMany({
      data: [...validIds].map((tagId) => ({ clientId, tagId })),
    }),
  ]);

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "client.tags.update",
    entityType: "Client",
    entityId: clientId,
    meta: { count: validIds.size },
  });

  revalidatePath(`/app/clients/${clientId}`);
  revalidatePath("/app/clients");
  return { ok: true };
}
