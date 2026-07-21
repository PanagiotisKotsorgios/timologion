import "server-only";
import {
  generateSecret as otpGenerateSecret,
  generateURI,
  verifySync,
} from "otplib";
import QRCode from "qrcode";

// TOTP with default RFC 6238 parameters (30s period, 6 digits, SHA-1) —
// compatible with Google Authenticator, Authy, 1Password, etc.

export function generateSecret(): string {
  return otpGenerateSecret();
}

export function buildOtpAuthUri(email: string, secret: string): string {
  return generateURI({
    label: email,
    issuer: "timologion",
    secret,
  });
}

export async function buildQrDataUrl(otpauthUri: string): Promise<string> {
  return QRCode.toDataURL(otpauthUri, { margin: 1, scale: 6 });
}

export function verifyTotp(secret: string, code: string): boolean {
  const cleaned = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;
  try {
    // Symmetric ±30s tolerance covers small clock drift on the authenticator
    // device without meaningfully widening the attack surface.
    const result = verifySync({
      token: cleaned,
      secret,
      epochTolerance: 30,
    });
    return result.valid === true;
  } catch {
    return false;
  }
}
