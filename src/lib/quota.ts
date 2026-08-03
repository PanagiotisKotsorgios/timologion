import "server-only";
import { prisma } from "@/lib/db";

export type QuotaCheck =
  | { ok: true; used: number; limit: number | null; remaining: number | null }
  | { ok: false; used: number; limit: number; error: string };

/**
 * Informational document quota — never blocks issuance.
 *
 * The real quota enforcement lives with the certified provider (Wrapp),
 * which caps the tenant based on their annual package (1,500 / 6,000 /
 * 18,000 / …). If a tenant runs over, Wrapp itself rejects the invoice
 * call with an error we surface to the user.
 *
 * Our local `PlatformPlan` / `BusinessSubscription` tables are purely
 * cosmetic / marketing at this stage. They exist so the dashboard can
 * show a usage widget, but they must NEVER refuse to issue a document
 * — the user has already paid the provider, and the provider is the
 * source of truth for what they can do.
 */
export async function checkDocumentQuota(
  businessId: string,
): Promise<QuotaCheck> {
  const sub = await prisma.businessSubscription.findFirst({
    where: {
      businessId,
      status: { in: ["active", "trialing"] },
    },
    include: {
      plan: { select: { includedDocsMonth: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Anything that consumed effort or Wrapp quota counts — issued, in-flight,
  // and even failed attempts. Only true drafts (never submitted) and
  // cancellations are excluded. This is what the operator actually thinks
  // of as "παραστατικά I've made this year".
  const countableStatuses = ["issued", "sending", "failed"] as const;

  // No local subscription = unlimited from our side. The provider still
  // enforces its own cap when we transmit.
  if (!sub) {
    const used = await prisma.document.count({
      where: { businessId, status: { in: [...countableStatuses] } },
    });
    return { ok: true, used, limit: null, remaining: null };
  }

  const limit = sub.plan.includedDocsMonth;
  if (!limit || limit <= 0) {
    const used = await prisma.document.count({
      where: {
        businessId,
        status: { in: [...countableStatuses] },
        issueDate: { gte: sub.currentPeriodStart, lte: sub.currentPeriodEnd },
      },
    });
    return { ok: true, used, limit: null, remaining: null };
  }

  const used = await prisma.document.count({
    where: {
      businessId,
      status: { in: [...countableStatuses] },
      issueDate: { gte: sub.currentPeriodStart, lte: sub.currentPeriodEnd },
    },
  });

  // Return usage stats but never mark ok=false. If the user is over their
  // local plan display allowance, that's marketing information, not a gate.
  return { ok: true, used, limit, remaining: Math.max(0, limit - used) };
}
