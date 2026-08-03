"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { formatZodError } from "@/lib/zod-el";

const createSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z][a-z0-9_]*$/, {
      message:
        "Το key πρέπει να ξεκινά με πεζό γράμμα και να περιέχει μόνο πεζά / αριθμούς / underscore.",
    }),
  description: z.string().max(500).optional().or(z.literal("")),
  rollout: z.enum(["none", "beta", "all"]).default("none"),
});

export async function createFlagAction(
  _prev: { error?: string; success?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const ctx = await requireAdmin("super_admin");
  const parsed = createSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  const exists = await prisma.featureFlag.findUnique({
    where: { key: parsed.data.key },
  });
  if (exists) return { error: "Αυτό το key υπάρχει ήδη." };

  await prisma.featureFlag.create({
    data: {
      key: parsed.data.key,
      description: parsed.data.description || null,
      rollout: parsed.data.rollout,
    },
  });

  await logAudit({
    userId: ctx.userId,
    action: "admin.feature_flag.create",
    entityType: "FeatureFlag",
    entityId: parsed.data.key,
    meta: parsed.data,
  });

  revalidatePath("/admin/feature-flags");
  return { success: `Δημιουργήθηκε flag "${parsed.data.key}".` };
}

export async function setFlagRolloutAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin");
  const key = String(formData.get("key") ?? "");
  const rollout = String(formData.get("rollout") ?? "");
  const pctRaw = formData.get("rolloutPct");
  if (!["none", "beta", "all"].includes(rollout)) return;

  const data: { rollout: "none" | "beta" | "all"; rolloutPct?: number } = {
    rollout: rollout as "none" | "beta" | "all",
  };
  if (pctRaw != null) {
    const pct = Math.max(0, Math.min(100, Number(pctRaw)));
    if (Number.isFinite(pct)) data.rolloutPct = pct;
  }

  await prisma.featureFlag.update({ where: { key }, data });

  await logAudit({
    userId: ctx.userId,
    action: "admin.feature_flag.set_rollout",
    entityType: "FeatureFlag",
    entityId: key,
    meta: { rollout, rolloutPct: data.rolloutPct ?? null },
  });

  revalidatePath("/admin/feature-flags");
}

export async function deleteFlagAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin");
  const key = String(formData.get("key") ?? "");
  if (!key) return;
  await prisma.featureFlag.delete({ where: { key } }).catch(() => undefined);
  await logAudit({
    userId: ctx.userId,
    action: "admin.feature_flag.delete",
    entityType: "FeatureFlag",
    entityId: key,
  });
  revalidatePath("/admin/feature-flags");
}

const overrideSchema = z.object({
  businessId: z.string().min(1),
  flagKey: z.string().min(1),
  enabled: z.union([z.literal("on"), z.literal("off"), z.literal("clear")]),
});

export async function setBusinessOverrideAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin");
  const parsed = overrideSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return;

  if (parsed.data.enabled === "clear") {
    await prisma.businessFeatureFlag
      .delete({
        where: {
          businessId_flagKey: {
            businessId: parsed.data.businessId,
            flagKey: parsed.data.flagKey,
          },
        },
      })
      .catch(() => undefined);
  } else {
    await prisma.businessFeatureFlag.upsert({
      where: {
        businessId_flagKey: {
          businessId: parsed.data.businessId,
          flagKey: parsed.data.flagKey,
        },
      },
      create: {
        businessId: parsed.data.businessId,
        flagKey: parsed.data.flagKey,
        enabled: parsed.data.enabled === "on",
      },
      update: { enabled: parsed.data.enabled === "on" },
    });
  }

  await logAudit({
    userId: ctx.userId,
    businessId: parsed.data.businessId,
    action: "admin.feature_flag.set_override",
    entityType: "FeatureFlag",
    entityId: parsed.data.flagKey,
    meta: { enabled: parsed.data.enabled },
  });

  revalidatePath("/admin/feature-flags");
  revalidatePath(`/admin/businesses/${parsed.data.businessId}`);
}
