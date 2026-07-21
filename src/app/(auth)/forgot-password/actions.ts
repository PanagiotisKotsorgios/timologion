"use server";

import { randomBytes, createHmac } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email/send";
import { passwordResetTemplate } from "@/lib/email/templates";
import { consume, LIMITS, clientIp } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email() });

export type ForgotState =
  | { error?: string; success?: string }
  | undefined;

const GENERIC_SUCCESS =
  "Αν το email υπάρχει στο σύστημά μας, θα σου στείλουμε οδηγίες για επαναφορά κωδικού μέσα σε λίγα λεπτά.";

export async function requestPasswordResetAction(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const parsed = schema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
  });
  if (!parsed.success) {
    return { error: "Δώσε ένα έγκυρο email." };
  }

  const hdrs = await headers();
  const ipAddress =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    null;

  const rl = consume(
    `forgot:${clientIp(hdrs)}`,
    LIMITS.forgotPassword.capacity,
    LIMITS.forgotPassword.refillMs,
  );
  if (!rl.ok) {
    return {
      error: `Πάρα πολλές προσπάθειες. Δοκίμασε ξανά σε ${rl.retryAfter} δευτερόλεπτα.`,
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, fullName: true, suspendedAt: true },
  });

  // Enumeration-safe: always tell the user the request was accepted.
  if (!user || user.suspendedAt) {
    return { success: GENERIC_SUCCESS };
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHmac("sha256", env.SESSION_SECRET)
    .update(token)
    .digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
      ipAddress: ipAddress?.slice(0, 60) ?? null,
    },
  });

  const baseUrl =
    hdrs.get("origin") ??
    (env.NODE_ENV === "production"
      ? "https://app.timologion.gr"
      : "http://localhost:3000");
  const url = `${baseUrl}/reset-password?token=${token}`;

  const { subject, html, text } = passwordResetTemplate({
    name: user.fullName,
    url,
    ipAddress,
  });

  const send = await sendEmail({
    to: { email: user.email, name: user.fullName },
    subject,
    html,
    text,
    tags: ["password-reset"],
  });

  await logAudit({
    userId: user.id,
    action: "auth.password_reset.request",
    ipAddress: ipAddress ?? undefined,
    meta: { sent: send.ok, dryRun: send.ok ? send.dryRun ?? false : false },
  });

  return { success: GENERIC_SUCCESS };
}
