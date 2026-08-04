"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { formatZodError } from "@/lib/zod-el";

const createSchema = z.object({
  name: z.string().min(2).max(160),
  metric: z.enum([
    "errors_1h",
    "errors_24h",
    "webhook_gap_hours",
    "past_due_subs",
    "backup_age_hours",
    "active_sessions",
    "new_signups_24h",
    "broken_documents",
  ]),
  comparator: z.enum(["gt", "gte", "lt", "lte", "eq"]).default("gt"),
  threshold: z.coerce.number(),
  emailTo: z.string().email(),
  cooldownMin: z.coerce.number().int().min(1).max(24 * 60).default(60),
});

export async function createRuleAction(
  _prev: { ok?: boolean; error?: string } | undefined,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const ctx = await requireAdmin("super_admin");
  const parsed = createSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  await prisma.alertRule.create({ data: parsed.data });

  await logAudit({
    userId: ctx.userId,
    action: "admin.alert_rule.create",
    entityType: "AlertRule",
    meta: parsed.data,
  });

  revalidatePath("/admin/alerts");
  return { ok: true };
}

export async function toggleRuleAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin");
  const id = String(formData.get("id") ?? "");
  const cur = await prisma.alertRule.findUnique({ where: { id } });
  if (!cur) return;
  await prisma.alertRule.update({
    where: { id },
    data: { enabled: !cur.enabled },
  });
  await logAudit({
    userId: ctx.userId,
    action: "admin.alert_rule.toggle",
    entityType: "AlertRule",
    entityId: id,
    meta: { enabled: !cur.enabled },
  });
  revalidatePath("/admin/alerts");
}

export async function deleteRuleAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.alertRule.delete({ where: { id } }).catch(() => undefined);
  await logAudit({
    userId: ctx.userId,
    action: "admin.alert_rule.delete",
    entityType: "AlertRule",
    entityId: id,
  });
  revalidatePath("/admin/alerts");
}
