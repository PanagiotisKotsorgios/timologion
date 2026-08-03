import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * Well-known flag keys. Adding a new gate = add here + a row in
 * FeatureFlag via the admin UI (or seed). Consumers read via
 * `isFeatureEnabled(businessId, FLAG_KEYS.pos_split_bill)`.
 */
export const FLAG_KEYS = {
  pos_split_bill: "pos_split_bill",
  crm_ai_summary: "crm_ai_summary",
  bulk_email: "bulk_email",
  advanced_reports: "advanced_reports",
} as const;

export type FlagKey = (typeof FLAG_KEYS)[keyof typeof FLAG_KEYS];

/**
 * Stable 0..99 bucket for a (flag, business) pair. sha256 gives a
 * uniform distribution so a rollout of 25 will hit ~25% of tenants,
 * deterministically — the same tenant either always sees the feature
 * or never does within a given percentage window.
 */
function rolloutBucket(flagKey: string, businessId: string): number {
  const h = createHash("sha256").update(`${flagKey}:${businessId}`).digest();
  // Use first 4 bytes as an unsigned int.
  const n =
    ((h[0] ?? 0) << 24) |
    ((h[1] ?? 0) << 16) |
    ((h[2] ?? 0) << 8) |
    (h[3] ?? 0);
  return (n >>> 0) % 100;
}

/**
 * Resolve a flag for a business. Per-business override wins over the
 * global rollout. Beta rollout = allow only businesses that were
 * explicitly enabled. All rollout further honors rolloutPct (0-100)
 * via a deterministic bucket so a partial rollout hits the same
 * tenants on every check.
 */
export async function isFeatureEnabled(
  businessId: string | null | undefined,
  key: string,
): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({
    where: { key },
    select: { rollout: true, rolloutPct: true },
  });
  if (!flag) return false;

  if (businessId) {
    const override = await prisma.businessFeatureFlag.findUnique({
      where: { businessId_flagKey: { businessId, flagKey: key } },
      select: { enabled: true },
    });
    if (override) return override.enabled;
  }

  if (flag.rollout !== "all") return false;
  if (!businessId) return flag.rolloutPct >= 100;
  return rolloutBucket(key, businessId) < flag.rolloutPct;
}

/**
 * Batch variant so a page loading many flags doesn't fire N round-trips.
 */
export async function isFeatureEnabledMap(
  businessId: string | null | undefined,
  keys: string[],
): Promise<Record<string, boolean>> {
  const [flags, overrides] = await Promise.all([
    prisma.featureFlag.findMany({
      where: { key: { in: keys } },
      select: { key: true, rollout: true, rolloutPct: true },
    }),
    businessId
      ? prisma.businessFeatureFlag.findMany({
          where: { businessId, flagKey: { in: keys } },
          select: { flagKey: true, enabled: true },
        })
      : Promise.resolve([]),
  ]);
  const overrideMap = new Map(overrides.map((o) => [o.flagKey, o.enabled]));
  const flagMap = new Map(flags.map((f) => [f.key, f]));
  const out: Record<string, boolean> = {};
  for (const k of keys) {
    if (overrideMap.has(k)) {
      out[k] = overrideMap.get(k)!;
      continue;
    }
    const f = flagMap.get(k);
    if (!f || f.rollout !== "all") {
      out[k] = false;
      continue;
    }
    out[k] = businessId
      ? rolloutBucket(k, businessId) < f.rolloutPct
      : f.rolloutPct >= 100;
  }
  return out;
}
