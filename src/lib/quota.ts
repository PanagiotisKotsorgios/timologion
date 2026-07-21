import "server-only";
import { prisma } from "@/lib/db";

export type QuotaCheck =
  | { ok: true; used: number; limit: number | null; remaining: number | null }
  | { ok: false; used: number; limit: number; error: string };

/**
 * Enforce the current subscription's monthly document allowance.
 *
 * Rules:
 * - No active subscription → hard block with a signup CTA message.
 * - Plan with `includedDocsMonth === 0` → unlimited (return ok).
 * - Otherwise → count documents issued this calendar month against the limit.
 *
 * Non-issued documents (drafts, cancelled, failed) do not count.
 */
export async function checkDocumentQuota(
  businessId: string,
): Promise<QuotaCheck> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const sub = await prisma.businessSubscription.findFirst({
    where: {
      businessId,
      status: { in: ["active", "trialing"] },
    },
    include: { plan: { select: { includedDocsMonth: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (!sub) {
    return {
      ok: false,
      used: 0,
      limit: 0,
      error:
        "Δεν έχεις ενεργή συνδρομή. Επίλεξε πακέτο από τις Ρυθμίσεις → Συνδρομή για να συνεχίσεις.",
    };
  }

  const limit = sub.plan.includedDocsMonth;
  if (!limit || limit <= 0) {
    return { ok: true, used: 0, limit: null, remaining: null };
  }

  const used = await prisma.document.count({
    where: {
      businessId,
      status: "issued",
      issueDate: { gte: monthStart },
    },
  });

  if (used >= limit) {
    return {
      ok: false,
      used,
      limit,
      error: `Έφτασες το όριο του πακέτου "${sub.plan.name}" για αυτόν τον μήνα (${limit} παραστατικά). Αναβάθμισε από τις Ρυθμίσεις → Συνδρομή.`,
    };
  }

  return { ok: true, used, limit, remaining: limit - used };
}
