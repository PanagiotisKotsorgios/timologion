"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

const PROBE_HANDLERS: Record<string, () => Promise<number>> = {
  expired_sessions: async () => {
    const now = new Date();
    const res = await prisma.session.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    return res.count;
  },
  expired_reset_tokens: async () => {
    const now = new Date();
    const res = await prisma.passwordReset.deleteMany({
      where: { usedAt: null, expiresAt: { lt: now } },
    });
    return res.count;
  },
  consumed_reset_tokens_old: async () => {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const res = await prisma.passwordReset.deleteMany({
      where: { usedAt: { not: null }, createdAt: { lt: cutoff } },
    });
    return res.count;
  },
  orphan_pos_items: async () => {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const res = await prisma.posTabItem.deleteMany({
      where: { tab: { status: "closed", closedAt: { lt: cutoff } } },
    });
    return res.count;
  },
  old_webhook_logs: async () => {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const res = await prisma.wrappWebhookLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return res.count;
  },
};

export async function runCleanupAction(
  formData: FormData,
): Promise<{ ok: true; deleted: number } | { ok: false; error: string }> {
  const ctx = await requireAdmin("super_admin");
  const key = String(formData.get("probeKey") ?? "");
  const handler = PROBE_HANDLERS[key];
  if (!handler) return { ok: false, error: "Άγνωστο probe." };

  const deleted = await handler();

  await logAudit({
    userId: ctx.userId,
    action: "admin.integrity.cleanup",
    entityType: "IntegrityProbe",
    entityId: key,
    meta: { deleted },
  });

  revalidatePath("/admin/integrity");
  return { ok: true, deleted };
}
