import "server-only";
import { createHmac, randomInt } from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { mfaCodeTemplate } from "@/lib/email/templates";

export type MfaPurpose = "enroll" | "login" | "disable";

/**
 * MFA-by-email replaces the old Authenticator TOTP scheme:
 *   1. Generate a random 6-digit code.
 *   2. Store its HMAC-hash + expiry in `MfaChallenge`.
 *   3. Deliver the plain code to the user's mailbox via Brevo.
 *   4. On verification: hash the user-supplied code, look up the newest
 *      non-consumed challenge for that (user, purpose), and constant-time
 *      compare.
 *
 * All previous non-consumed challenges for the same (user, purpose) are
 * invalidated when a new one is issued — the freshest email always wins.
 *
 * Attempt counter: every mistaken code increments `attempts`. After 5 tries
 * the challenge is marked consumed so the user must request a fresh code.
 */
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

function hash(code: string): string {
  return createHmac("sha256", env.SESSION_SECRET).update(code).digest("hex");
}

function generateCode(): string {
  // 6-digit zero-padded numeric code — same shape TOTP produced, so form
  // fields, autocomplete="one-time-code" and localstorage inputs don't
  // need any UX changes.
  const n = randomInt(0, 1_000_000);
  return String(n).padStart(6, "0");
}

/**
 * Send a fresh code and issue a corresponding challenge row. Returns the
 * challenge id so callers that want a rate-limit key can use it, but the
 * hot path never needs it.
 */
export async function sendMfaCode(
  userId: string,
  purpose: MfaPurpose,
): Promise<{ ok: true; challengeId: string } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, fullName: true },
  });
  if (!user) return { ok: false, error: "Δεν βρέθηκε ο λογαριασμός." };

  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  // Invalidate every non-consumed challenge for this (user, purpose) so
  // there's only ever one live code at a time.
  await prisma.mfaChallenge.updateMany({
    where: { userId, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const created = await prisma.mfaChallenge.create({
    data: {
      userId,
      codeHash: hash(code),
      purpose,
      expiresAt,
    },
    select: { id: true },
  });

  const { subject, html, text } = mfaCodeTemplate({
    name: user.fullName || "",
    code,
    purpose,
  });

  await sendEmail({
    to: { email: user.email, name: user.fullName },
    subject,
    html,
    text,
    tags: ["mfa-otp"],
  }).catch(() => undefined);

  return { ok: true, challengeId: created.id };
}

/**
 * Verify a code the user just typed. Returns { ok: true } on success,
 * various error codes on failure. Consumes the challenge on success or
 * when the attempt cap is hit.
 */
export async function verifyMfaCode(
  userId: string,
  purpose: MfaPurpose,
  code: string,
): Promise<
  | { ok: true }
  | { ok: false; error: string; exhausted?: boolean; expired?: boolean }
> {
  const trimmed = String(code ?? "").replace(/\D/g, "");
  if (trimmed.length !== 6) {
    return { ok: false, error: "Ο κωδικός πρέπει να είναι 6 ψηφία." };
  }

  const row = await prisma.mfaChallenge.findFirst({
    where: { userId, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!row) {
    return {
      ok: false,
      error:
        "Δεν υπάρχει ενεργός κωδικός επιβεβαίωσης. Ζήτησε νέο για να συνεχίσεις.",
    };
  }
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.mfaChallenge.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });
    return {
      ok: false,
      expired: true,
      error: "Ο κωδικός έχει λήξει. Ζήτησε νέο.",
    };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    await prisma.mfaChallenge.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });
    return {
      ok: false,
      exhausted: true,
      error: "Πάρα πολλές λανθασμένες προσπάθειες. Ζήτησε νέο κωδικό.",
    };
  }

  if (hash(trimmed) !== row.codeHash) {
    await prisma.mfaChallenge.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: "Ο κωδικός δεν είναι σωστός." };
  }

  await prisma.mfaChallenge.update({
    where: { id: row.id },
    data: { consumedAt: new Date() },
  });
  return { ok: true };
}
