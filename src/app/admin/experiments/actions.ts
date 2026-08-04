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
      message: "Πεζά, αριθμοί, underscores μόνο.",
    }),
  description: z.string().max(500).optional().or(z.literal("")),
  variantAPct: z.coerce.number().int().min(0).max(100).default(50),
  hypothesis: z.string().max(2000).optional().or(z.literal("")),
});

export async function createExperimentAction(
  _prev: { ok?: boolean; error?: string } | undefined,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const ctx = await requireAdmin("super_admin");
  const parsed = createSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  const exists = await prisma.experiment.findUnique({
    where: { key: parsed.data.key },
  });
  if (exists) return { error: "Αυτό το key υπάρχει ήδη." };

  await prisma.experiment.create({
    data: {
      key: parsed.data.key,
      description: parsed.data.description || null,
      variantAPct: parsed.data.variantAPct,
      hypothesis: parsed.data.hypothesis || null,
    },
  });

  await logAudit({
    userId: ctx.userId,
    action: "admin.experiment.create",
    entityType: "Experiment",
    entityId: parsed.data.key,
  });

  revalidatePath("/admin/experiments");
  return { ok: true };
}

export async function setExperimentStatusAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin");
  const key = String(formData.get("key") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["draft", "running", "paused", "completed"].includes(status)) return;

  await prisma.experiment.update({
    where: { key },
    data: { status: status as "draft" | "running" | "paused" | "completed" },
  });

  await logAudit({
    userId: ctx.userId,
    action: "admin.experiment.set_status",
    entityType: "Experiment",
    entityId: key,
    meta: { status },
  });

  revalidatePath("/admin/experiments");
  revalidatePath(`/admin/experiments/${encodeURIComponent(key)}`);
}

export async function deleteExperimentAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin");
  const key = String(formData.get("key") ?? "");
  if (!key) return;
  await prisma.experiment.delete({ where: { key } }).catch(() => undefined);
  await logAudit({
    userId: ctx.userId,
    action: "admin.experiment.delete",
    entityType: "Experiment",
    entityId: key,
  });
  revalidatePath("/admin/experiments");
}
