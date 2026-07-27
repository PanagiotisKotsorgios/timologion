"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { sendMfaCode, verifyMfaCode } from "@/lib/auth/mfa-otp";
import { logAudit } from "@/lib/audit";
import { consume, LIMITS, clientIp } from "@/lib/rate-limit";
import { t } from "@/lib/i18n";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totp: z.string().optional(),
});

export type LoginState =
  | { error?: string; needsOtp?: boolean; email?: string }
  | undefined;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const hdrs = await headers();
  const rl = consume(
    `login:${clientIp(hdrs)}`,
    LIMITS.login.capacity,
    LIMITS.login.refillMs,
  );
  if (!rl.ok) {
    return {
      error: `Πάρα πολλές προσπάθειες σύνδεσης. Δοκίμασε ξανά σε ${rl.retryAfter} δευτερόλεπτα.`,
    };
  }

  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
    totp: String(formData.get("totp") ?? "").trim(),
  });

  if (!parsed.success) {
    return { error: t.auth.invalidCredentials };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      passwordHash: true,
      platformRole: true,
      mfaEnabled: true,
    },
  });

  if (!user) {
    return { error: t.auth.invalidCredentials };
  }

  const ok = await verifyPassword(user.passwordHash, parsed.data.password);
  if (!ok) {
    return { error: t.auth.invalidCredentials };
  }

  // 2FA challenge — email a 6-digit code and require verification. First
  // pass through the form has no code, so we mint and send one; on the
  // follow-up submit the user pastes the code and we verify it against
  // the latest MfaChallenge row.
  if (user.mfaEnabled) {
    if (!parsed.data.totp) {
      await sendMfaCode(user.id, "login");
      return {
        needsOtp: true,
        email: parsed.data.email,
        error:
          "Σου στείλαμε 6-ψήφιο κωδικό στο email σου. Δώσ' τον για να συνεχίσεις.",
      };
    }
    const check = await verifyMfaCode(user.id, "login", parsed.data.totp);
    if (!check.ok) {
      return {
        needsOtp: true,
        email: parsed.data.email,
        error: check.error,
      };
    }
  }

  const remember = formData.get("remember") === "on";
  await createSession(user.id, { remember });
  await logAudit({ userId: user.id, action: "auth.login", meta: { remember } });

  redirect(user.platformRole ? "/admin" : "/app");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
