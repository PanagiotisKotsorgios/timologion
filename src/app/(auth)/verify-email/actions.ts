"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { sendVerificationEmail } from "@/lib/auth/email-verify";
import { consume, LIMITS } from "@/lib/rate-limit";

export async function resendVerificationAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Δεν είσαι συνδεδεμένος." };

  const rl = consume(
    `verify-resend:${session.userId}`,
    LIMITS.forgotPassword.capacity,
    LIMITS.forgotPassword.refillMs,
  );
  if (!rl.ok) {
    return {
      ok: false,
      error: `Πάρα πολλά αιτήματα. Δοκίμασε σε ${rl.retryAfter} δευτερόλεπτα.`,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, fullName: true, emailVerifiedAt: true },
  });
  if (!user) return { ok: false, error: "Δεν βρέθηκε ο λογαριασμός." };
  if (user.emailVerifiedAt) return { ok: true }; // silently succeed

  await sendVerificationEmail({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
  });
  return { ok: true };
}
