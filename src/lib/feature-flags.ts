import "server-only";
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
 * Resolve a flag for a business. Per-business override wins over the
 * global rollout. Beta rollout = allow only businesses that were
 * explicitly enabled — an override with `enabled=false` disables even
 * a fully-rolled-out feature.
 */
export async function isFeatureEnabled(
  businessId: string | null | undefined,
  key: string,
): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({
    where: { key },
    select: { rollout: true },
  });
  if (!flag) return false;

  if (businessId) {
    const override = await prisma.businessFeatureFlag.findUnique({
      where: { businessId_flagKey: { businessId, flagKey: key } },
      select: { enabled: true },
    });
    if (override) return override.enabled;
  }

  return flag.rollout === "all";
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
      select: { key: true, rollout: true },
    }),
    businessId
      ? prisma.businessFeatureFlag.findMany({
          where: { businessId, flagKey: { in: keys } },
          select: { flagKey: true, enabled: true },
        })
      : Promise.resolve([]),
  ]);
  const overrideMap = new Map(overrides.map((o) => [o.flagKey, o.enabled]));
  const flagMap = new Map(flags.map((f) => [f.key, f.rollout]));
  const out: Record<string, boolean> = {};
  for (const k of keys) {
    if (overrideMap.has(k)) out[k] = overrideMap.get(k)!;
    else out[k] = flagMap.get(k) === "all";
  }
  return out;
}
