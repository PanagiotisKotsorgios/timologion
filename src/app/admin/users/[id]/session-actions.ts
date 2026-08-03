"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";

/**
 * Revoke a single session. The Session row is deleted so any request
 * with that cookie will bounce to /login on the next hit.
 */
export async function revokeSessionAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin", "support");
  const sessionId = String(formData.get("sessionId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!sessionId || !userId) return;

  await prisma.session
    .delete({ where: { id: sessionId } })
    .catch(() => undefined);

  await logAudit({
    userId: ctx.userId,
    action: "admin.user.session.revoke",
    entityType: "Session",
    entityId: sessionId,
    meta: { targetUserId: userId },
  });

  revalidatePath(`/admin/users/${userId}`);
}

/**
 * Revoke ALL of a user's sessions. Handy after a suspected credential
 * leak — one click and every logged-in device gets kicked.
 */
export async function revokeAllSessionsAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin", "support");
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  const res = await prisma.session.deleteMany({ where: { userId } });

  await logAudit({
    userId: ctx.userId,
    action: "admin.user.session.revoke_all",
    entityType: "User",
    entityId: userId,
    meta: { deletedCount: res.count },
  });

  revalidatePath(`/admin/users/${userId}`);
}

/**
 * Send a password-reset email as if the user clicked "forgot password".
 * Useful for stuck accounts where email verification or 2FA is broken.
 * The existing password stays valid — only the reset link is created.
 */
export async function forcePasswordResetAction(formData: FormData): Promise<void> {
  const ctx = await requireAdmin("super_admin", "support");
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  const { requestPasswordResetForUser } = await import(
    "@/lib/auth/password-reset-admin"
  );
  const res = await requestPasswordResetForUser(userId);

  await logAudit({
    userId: ctx.userId,
    action: "admin.user.password_reset.send",
    entityType: "User",
    entityId: userId,
    meta: { sent: res.sent, email: res.email ?? "", error: res.error ?? "" },
  });

  revalidatePath(`/admin/users/${userId}`);
}
