"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { sendMfaCode, verifyMfaCode } from "@/lib/auth/mfa-otp";
import { consume, LIMITS, clientIp } from "@/lib/rate-limit";
import {
  OAUTH_MFA_PENDING_COOKIE,
  verifyOAuthMfaPendingCookie,
} from "@/lib/auth/oauth";

const schema = z.object({
  totp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Ο κωδικός πρέπει να είναι 6 ψηφία."),
});

export type OAuthMfaState = { error?: string } | undefined;

export async function verifyOAuthMfaAction(
  _prev: OAuthMfaState,
  formData: FormData,
): Promise<OAuthMfaState> {
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

  const jar = await cookies();
  const pending = verifyOAuthMfaPendingCookie(
    jar.get(OAUTH_MFA_PENDING_COOKIE)?.value,
  );
  if (!pending) {
    return {
      error:
        "Η προσωρινή συνεδρία σύνδεσης έληξε. Επίστρεψε στη σύνδεση και δοκίμασε ξανά.",
    };
  }

  const parsed = schema.safeParse({
    totp: String(formData.get("totp") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Μη έγκυρος κωδικός." };
  }

  const check = await verifyMfaCode(pending.userId, "login", parsed.data.totp);
  if (!check.ok) {
    return { error: check.error };
  }

  jar.delete(OAUTH_MFA_PENDING_COOKIE);

  await createSession(pending.userId, {
    userAgent: hdrs.get("user-agent") ?? undefined,
    ipAddress:
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      hdrs.get("x-real-ip") ??
      undefined,
    remember: true,
  });

  await logAudit({
    userId: pending.userId,
    action: "auth.oauth.mfa_ok",
    entityType: "User",
    entityId: pending.userId,
  });

  const hasMembership = await prisma.businessMember.findFirst({
    where: { userId: pending.userId },
    select: { businessId: true },
  });

  redirect(hasMembership ? "/app" : "/app/onboarding");
}

export async function resendOAuthMfaAction(): Promise<OAuthMfaState> {
  const jar = await cookies();
  const pending = verifyOAuthMfaPendingCookie(
    jar.get(OAUTH_MFA_PENDING_COOKIE)?.value,
  );
  if (!pending) {
    return {
      error:
        "Η προσωρινή συνεδρία σύνδεσης έληξε. Επίστρεψε στη σύνδεση και δοκίμασε ξανά.",
    };
  }
  await sendMfaCode(pending.userId, "login").catch(() => undefined);
  return { error: "Στάλθηκε νέος 6-ψήφιος κωδικός στο email σου." };
}
