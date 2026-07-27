"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { sendMfaCode, verifyMfaCode } from "@/lib/auth/mfa-otp";
import { consume, LIMITS } from "@/lib/rate-limit";

/**
 * Begin enrolment — email the user a 6-digit code. The account isn't
 * flipped to mfaEnabled until they type the code back in
 * `confirmEnrollmentAction`.
 */
export async function startEnrollmentAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Δεν είσαι συνδεδεμένος." };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { mfaEnabled: true, emailVerifiedAt: true, email: true },
  });
  if (!user) return { ok: false, error: "Δεν βρέθηκε ο λογαριασμός." };
  if (user.mfaEnabled)
    return { ok: false, error: "Το 2FA είναι ήδη ενεργοποιημένο." };
  if (!user.emailVerifiedAt) {
    return {
      ok: false,
      error:
        "Επιβεβαίωσε πρώτα το email σου για να ενεργοποιήσεις 2FA. Δες τον σύνδεσμο που σου στείλαμε στα εισερχόμενα.",
    };
  }

  const rl = consume(
    `mfa-enroll:${session.userId}`,
    LIMITS.forgotPassword.capacity,
    LIMITS.forgotPassword.refillMs,
  );
  if (!rl.ok) {
    return {
      ok: false,
      error: `Πάρα πολλά αιτήματα. Δοκίμασε σε ${rl.retryAfter} δευτερόλεπτα.`,
    };
  }

  const res = await sendMfaCode(session.userId, "enroll");
  if (!res.ok) return res;
  return { ok: true };
}

const confirmSchema = z.object({
  code: z.string().min(6).max(10),
});

export async function confirmEnrollmentAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Δεν είσαι συνδεδεμένος." };

  const parsed = confirmSchema.safeParse({
    code: String(formData.get("code") ?? ""),
  });
  if (!parsed.success) return { ok: false, error: "Δώσε έγκυρα στοιχεία." };

  const check = await verifyMfaCode(
    session.userId,
    "enroll",
    parsed.data.code,
  );
  if (!check.ok) return { ok: false, error: check.error };

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      mfaEnabled: true,
      // Legacy TOTP secret column no longer holds anything meaningful.
      mfaSecretEnc: null,
      mfaVerifiedAt: new Date(),
    },
  });
  await logAudit({ userId: session.userId, action: "user.mfa.enable" });
  revalidatePath("/app/settings/account/2fa");
  revalidatePath("/app/settings/account");
  return { ok: true };
}

/** Send a fresh disable-code to the user's mailbox. */
export async function requestDisableCodeAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Δεν είσαι συνδεδεμένος." };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { mfaEnabled: true },
  });
  if (!user?.mfaEnabled) return { ok: false, error: "Το 2FA δεν είναι ενεργό." };

  const rl = consume(
    `mfa-disable:${session.userId}`,
    LIMITS.forgotPassword.capacity,
    LIMITS.forgotPassword.refillMs,
  );
  if (!rl.ok) {
    return {
      ok: false,
      error: `Πάρα πολλά αιτήματα. Δοκίμασε σε ${rl.retryAfter} δευτερόλεπτα.`,
    };
  }

  const res = await sendMfaCode(session.userId, "disable");
  if (!res.ok) return res;
  return { ok: true };
}

const disableSchema = z.object({
  password: z.string().optional(),
  code: z.string().min(6).max(10),
});

export async function disable2faAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Δεν είσαι συνδεδεμένος." };

  const parsed = disableSchema.safeParse({
    password: String(formData.get("password") ?? ""),
    code: String(formData.get("code") ?? ""),
  });
  if (!parsed.success) return { ok: false, error: "Δώσε έγκυρα στοιχεία." };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { passwordHash: true, mfaEnabled: true },
  });
  if (!user || !user.mfaEnabled)
    return { ok: false, error: "Το 2FA δεν είναι ενεργό." };

  if (user.passwordHash) {
    const ok = await verifyPassword(
      user.passwordHash,
      parsed.data.password ?? "",
    );
    if (!ok) return { ok: false, error: "Λάθος κωδικός." };
  }

  const check = await verifyMfaCode(
    session.userId,
    "disable",
    parsed.data.code,
  );
  if (!check.ok) return { ok: false, error: check.error };

  await prisma.user.update({
    where: { id: session.userId },
    data: { mfaEnabled: false, mfaSecretEnc: null, mfaVerifiedAt: null },
  });
  await logAudit({ userId: session.userId, action: "user.mfa.disable" });
  revalidatePath("/app/settings/account/2fa");
  revalidatePath("/app/settings/account");
  return { ok: true };
}
