import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * Generate a fresh API key. The plaintext token is returned ONCE at
 * creation time; only the sha256 hash is stored. The prefix is safe to
 * show in listings for identification ("sk_live_abcd…").
 */
export function generateApiKey(): {
  plaintext: string;
  prefix: string;
  keyHash: string;
} {
  const raw = "sk_live_" + randomBytes(24).toString("hex");
  const prefix = raw.slice(0, 12);
  const keyHash = createHash("sha256").update(raw).digest("hex");
  return { plaintext: raw, prefix, keyHash };
}

/**
 * Verify a Bearer token against the ApiKey table. Returns the
 * associated business if valid + not revoked, null otherwise. Also
 * bumps lastUsedAt so the admin sees stale keys.
 */
export async function verifyApiKey(bearer: string): Promise<{
  businessId: string;
  keyId: string;
  scopes: string[];
} | null> {
  if (!bearer || !bearer.startsWith("sk_live_")) return null;
  const keyHash = createHash("sha256").update(bearer).digest("hex");
  const row = await prisma.apiKey.findFirst({
    where: { keyHash, revokedAt: null },
    select: {
      id: true,
      businessId: true,
      scopes: true,
    },
  });
  if (!row) return null;
  // Best-effort touch — never blocks the request.
  prisma.apiKey
    .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);
  return {
    businessId: row.businessId,
    keyId: row.id,
    scopes: (row.scopes ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}
