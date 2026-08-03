"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { formatZodError } from "@/lib/zod-el";

const schema = z.object({
  businessId: z.string().min(1),
  action: z.string().min(1).max(60),
  capacity: z.coerce.number().int().min(1).max(100000),
  refillMs: z.coerce.number().int().min(1).max(3_600_000),
  note: z.string().max(500).optional().or(z.literal("")),
});

export async function saveOverrideAction(
  _prev: { ok?: boolean; error?: string } | undefined,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const ctx = await requireAdmin("super_admin");
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  await prisma.rateLimitOverride.upsert({
    where: {
      businessId_action: {
        businessId: parsed.data.businessId,
        action: parsed.data.action,
      },
    },
    create: {
      businessId: parsed.data.businessId,
      action: parsed.data.action,
      capacity: parsed.data.capacity,
      refillMs: parsed.data.refillMs,
      note: parsed.data.note || null,
    },
    update: {
      capacity: parsed.data.capacity,
      refillMs: parsed.data.refillMs,
      note: parsed.data.note || null,
    },
  });

  await logAudit({
    userId: ctx.userId,
    businessId: parsed.data.businessId,
    action: "admin.rate_limit.upsert",
    entityType: "RateLimitOverride",
    entityId: parsed.data.action,
    meta: {
      capacity: parsed.data.capacity,
      refillMs: parsed.data.refillMs,
    },
  });

  revalidatePath("/admin/rate-limits");
  return { ok: true };
}

export async function deleteOverrideAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const row = await prisma.rateLimitOverride
    .delete({ where: { id } })
    .catch(() => null);
  if (row) {
    await logAudit({
      userId: ctx.userId,
      businessId: row.businessId,
      action: "admin.rate_limit.delete",
      entityType: "RateLimitOverride",
      entityId: row.action,
    });
  }
  revalidatePath("/admin/rate-limits");
}
