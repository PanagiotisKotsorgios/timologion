"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { verifyTotp } from "@/lib/auth/totp";
import { decryptSecret } from "@/lib/crypto";
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
      mfaSecretEnc: true,
    },
  });

  if (!user) {
    return { error: t.auth.invalidCredentials };
  }

  const ok = await verifyPassword(user.passwordHash, parsed.data.password);
  if (!ok) {
    return { error: t.auth.invalidCredentials };
  }

  // 2FA challenge — if user has MFA enabled, require + verify TOTP.
  if (user.mfaEnabled) {
    if (!parsed.data.totp) {
      return {
        needsOtp: true,
        email: parsed.data.email,
        error: "Δώσε τον 6-ψήφιο κωδικό από την εφαρμογή Authenticator.",
      };
    }
    const secret = user.mfaSecretEnc ? decryptSecret(user.mfaSecretEnc) : null;
    if (!secret || !verifyTotp(secret, parsed.data.totp)) {
      return {
        needsOtp: true,
        email: parsed.data.email,
        error: "Ο κωδικός 2FA δεν είναι σωστός.",
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
