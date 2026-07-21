import "server-only";
import { randomBytes, createHmac } from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { emailVerifyTemplate } from "@/lib/email/templates";

function tokenHash(raw: string): string {
  return createHmac("sha256", env.SESSION_SECRET).update(raw).digest("hex");
}

/**
 * Create a fresh email-verification token for the user and email them a link
 * to /verify-email?token=... . Old, unconsumed tokens for this user are
 * invalidated so the newest email always wins.
 */
export async function sendVerificationEmail(user: {
  id: string;
  email: string;
  fullName: string;
}): Promise<void> {
  await prisma.emailVerification.updateMany({
    where: { userId: user.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const raw = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  await prisma.emailVerification.create({
    data: { userId: user.id, tokenHash: tokenHash(raw), expiresAt },
  });

  const url = `${env.APP_BASE_URL.replace(/\/$/, "")}/verify-email?token=${raw}`;
  const { subject, html, text } = emailVerifyTemplate({
    name: user.fullName,
    url,
  });

  await sendEmail({
    to: { email: user.email, name: user.fullName },
    subject,
    html,
    text,
    tags: ["email-verify"],
  }).catch(() => undefined);
}

/**
 * Consume a token: mark it consumed and set User.emailVerifiedAt. Returns the
 * userId on success, null on invalid/expired/consumed token.
 */
export async function consumeVerificationToken(
  raw: string,
): Promise<string | null> {
  if (!raw || raw.length < 20) return null;
  const hash = tokenHash(raw);
  const row = await prisma.emailVerification.findUnique({
    where: { tokenHash: hash },
    select: { id: true, userId: true, expiresAt: true, consumedAt: true },
  });
  if (!row) return null;
  if (row.consumedAt) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;

  await prisma.$transaction([
    prisma.emailVerification.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: row.userId },
      data: { emailVerifiedAt: new Date() },
    }),
  ]);
  return row.userId;
}
