import "server-only";
import { randomBytes, createHmac } from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { passwordResetTemplate } from "@/lib/email/templates";
import { logger } from "@/lib/logger";

/**
 * Send a password-reset email on behalf of a support agent. Mirrors the
 * user-facing forgot-password flow but takes a userId directly instead
 * of an email address, and returns an operational result the admin UI
 * can display. No rate limit — the admin already had to sign in.
 */
export async function requestPasswordResetForUser(userId: string): Promise<{
  ok: boolean;
  sent: boolean;
  email?: string;
  error?: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, suspendedAt: true },
  });
  if (!user) return { ok: false, sent: false, error: "user_not_found" };
  if (user.suspendedAt)
    return { ok: false, sent: false, error: "user_suspended" };

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHmac("sha256", env.SESSION_SECRET)
    .update(token)
    .digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await prisma.passwordReset.create({
    data: { userId: user.id, tokenHash, expiresAt, ipAddress: null },
  });

  const baseUrl = env.APP_BASE_URL.replace(/\/$/, "");
  const url = `${baseUrl}/reset-password?token=${token}`;

  const { subject, html, text } = passwordResetTemplate({
    name: user.fullName,
    url,
    ipAddress: null,
  });

  try {
    const send = await sendEmail({
      to: { email: user.email, name: user.fullName },
      subject,
      html,
      text,
      tags: ["password-reset", "admin-initiated"],
    });
    return { ok: true, sent: send.ok, email: user.email };
  } catch (err) {
    logger.error("admin.password_reset.email_failed", err, { userId });
    return { ok: true, sent: false, email: user.email };
  }
}
