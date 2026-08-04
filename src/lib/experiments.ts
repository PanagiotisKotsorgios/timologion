import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * Return "A" or "B" for the given (experiment, business) pair.
 * Deterministic — the same tenant always sees the same variant while
 * the experiment is running. If the experiment isn't running (or
 * doesn't exist), we return "A" as the safe fallback.
 */
export async function getExperimentVariant(
  experimentKey: string,
  businessId: string | null | undefined,
): Promise<"A" | "B"> {
  if (!businessId) return "A";
  const exp = await prisma.experiment.findUnique({
    where: { key: experimentKey },
    select: { status: true, variantAPct: true },
  });
  if (!exp || exp.status !== "running") return "A";
  const h = createHash("sha256")
    .update(`${experimentKey}:${businessId}`)
    .digest();
  const bucket =
    (((h[0] ?? 0) << 24) |
      ((h[1] ?? 0) << 16) |
      ((h[2] ?? 0) << 8) |
      (h[3] ?? 0)) >>>
    0;
  return bucket % 100 < exp.variantAPct ? "A" : "B";
}

/**
 * Record an event against an experiment. Fire and forget from the
 * caller's perspective — never throws.
 */
export async function trackExperimentEvent(
  experimentKey: string,
  businessId: string | null | undefined,
  event: string,
  value?: number,
): Promise<void> {
  try {
    const variant = await getExperimentVariant(experimentKey, businessId);
    await prisma.experimentEvent.create({
      data: {
        experimentKey,
        businessId: businessId ?? null,
        variant,
        event: event.slice(0, 60),
        value: value ?? null,
      },
    });
  } catch {
    // Never let analytics break the primary flow.
  }
}
