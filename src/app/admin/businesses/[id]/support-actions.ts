"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { formatZodError } from "@/lib/zod-el";

const schema = z.object({
  businessId: z.string().min(1),
  notes: z.string().max(10_000).optional().or(z.literal("")),
  tags: z.string().max(500).optional().or(z.literal("")),
});

export async function saveSupportNotesAction(
  formData: FormData,
): Promise<{ success?: string; error?: string }> {
  const ctx = await requireAdmin("super_admin", "support");
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  // Normalize tags: split on comma, trim, dedupe, drop empties, rejoin.
  const normalizedTags = Array.from(
    new Set(
      (parsed.data.tags ?? "")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  ).join(",");

  await prisma.business.update({
    where: { id: parsed.data.businessId },
    data: {
      supportNotes: parsed.data.notes || null,
      supportTags: normalizedTags || null,
    },
  });

  await logAudit({
    userId: ctx.userId,
    businessId: parsed.data.businessId,
    action: "admin.business.support_notes.update",
    entityType: "Business",
    entityId: parsed.data.businessId,
    meta: { tags: normalizedTags, notesLength: (parsed.data.notes ?? "").length },
  });

  revalidatePath(`/admin/businesses/${parsed.data.businessId}`);
  return { success: "Αποθηκεύτηκε." };
}

export async function setBusinessFlagOverrideAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin");
  const businessId = String(formData.get("businessId") ?? "");
  const flagKey = String(formData.get("flagKey") ?? "");
  const state = String(formData.get("state") ?? "");
  if (!businessId || !flagKey) return;

  if (state === "clear") {
    await prisma.businessFeatureFlag
      .delete({
        where: { businessId_flagKey: { businessId, flagKey } },
      })
      .catch(() => undefined);
  } else if (state === "on" || state === "off") {
    await prisma.businessFeatureFlag.upsert({
      where: { businessId_flagKey: { businessId, flagKey } },
      create: { businessId, flagKey, enabled: state === "on" },
      update: { enabled: state === "on" },
    });
  }

  await logAudit({
    userId: ctx.userId,
    businessId,
    action: "admin.business.feature_flag.set",
    entityType: "FeatureFlag",
    entityId: flagKey,
    meta: { state },
  });

  revalidatePath(`/admin/businesses/${businessId}`);
}
