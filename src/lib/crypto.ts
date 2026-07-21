import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
import { env } from "./env";

// Simple AES-256-GCM around SESSION_SECRET-derived key. Small blast radius:
// only used for reversibly storing third-party API passwords (e.g. AADE).

const ALGO = "aes-256-gcm";

function key(): Buffer {
  // Derive a 32-byte key from SESSION_SECRET (any length).
  return createHash("sha256").update(env.SESSION_SECRET).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Store as base64: version || iv || tag || ciphertext
  return `v1.${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

export function decryptSecret(payload: string): string | null {
  try {
    const [version, ivB64, tagB64, encB64] = payload.split(".");
    if (version !== "v1" || !ivB64 || !tagB64 || !encB64) return null;
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const enc = Buffer.from(encB64, "base64");
    const decipher = createDecipheriv(ALGO, key(), iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}
