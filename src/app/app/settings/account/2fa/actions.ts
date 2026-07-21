"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import {
  generateSecret,
  buildOtpAuthUri,
  buildQrDataUrl,
  verifyTotp,
} from "@/lib/auth/totp";
import { verifyPassword } from "@/lib/auth/password";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

/**
 * Begin enrolment: generate a fresh secret + QR + otpauth URI. Nothing is
 * persisted yet — the secret must be confirmed by an OTP challenge in
 * confirmEnrollmentAction before it's saved to the user row.
 */
export async function startEnrollmentAction(): Promise<
  | { ok: true; secret: string; otpauth: string; qr: string }
  | { ok: false; error: string }
> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Δεν είσαι συνδεδεμένος." };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, mfaEnabled: true },
  });
  if (!user) return { ok: false, error: "Δεν βρέθηκε ο λογαριασμός." };
  if (user.mfaEnabled)
    return { ok: false, error: "Το 2FA είναι ήδη ενεργοποιημένο." };

  const secret = generateSecret();
  const otpauth = buildOtpAuthUri(user.email, secret);
  const qr = await buildQrDataUrl(otpauth);

  return { ok: true, secret, otpauth, qr };
}

const confirmSchema = z.object({
  secret: z.string().min(10).max(200),
  code: z.string().min(6).max(10),
});

export async function confirmEnrollmentAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Δεν είσαι συνδεδεμένος." };

  const parsed = confirmSchema.safeParse({
    secret: String(formData.get("secret") ?? ""),
    code: String(formData.get("code") ?? ""),
  });
  if (!parsed.success) return { ok: false, error: "Δώσε έγκυρα στοιχεία." };

  if (!verifyTotp(parsed.data.secret, parsed.data.code)) {
    return { ok: false, error: "Ο κωδικός δεν είναι σωστός." };
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      mfaEnabled: true,
      mfaSecretEnc: encryptSecret(parsed.data.secret),
      mfaVerifiedAt: new Date(),
    },
  });
  await logAudit({ userId: session.userId, action: "user.mfa.enable" });
  revalidatePath("/app/settings/account/2fa");
  revalidatePath("/app/settings/account");
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
    select: {
      passwordHash: true,
      mfaEnabled: true,
      mfaSecretEnc: true,
    },
  });
  if (!user || !user.mfaEnabled) return { ok: false, error: "Το 2FA δεν είναι ενεργό." };

  if (user.passwordHash) {
    const ok = await verifyPassword(user.passwordHash, parsed.data.password ?? "");
    if (!ok) return { ok: false, error: "Λάθος κωδικός." };
  }

  const secret = user.mfaSecretEnc ? decryptSecret(user.mfaSecretEnc) : null;
  if (!secret || !verifyTotp(secret, parsed.data.code)) {
    return { ok: false, error: "Ο κωδικός 2FA δεν είναι σωστός." };
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { mfaEnabled: false, mfaSecretEnc: null, mfaVerifiedAt: null },
  });
  await logAudit({ userId: session.userId, action: "user.mfa.disable" });
  revalidatePath("/app/settings/account/2fa");
  revalidatePath("/app/settings/account");
  return { ok: true };
}
