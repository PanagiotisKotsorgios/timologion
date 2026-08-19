import "server-only";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { logAudit } from "@/lib/audit";
import { getWrappPartnerClient } from "@/lib/wrapp/http-client";
import { reconcileWrappForBusiness } from "@/lib/wrapp/reconcile";

/**
 * Subscription renewal detection + rollover.
 *
 * Wrapp doesn't push us renewal events — Constantinos was explicit
 * about that. We poll each active subscription and decide locally
 * when a new period has started. Two triggers, whichever hits first:
 *
 *   • time trigger  — now >= currentPeriodEnd (12 months elapsed since
 *                     the period started).
 *   • usage trigger — issuedCountUpstream - issuedCountBaseline >=
 *                     plan.includedDocsMonth (the tenant's used up
 *                     the annual cap; Wrapp starts a new period).
 *
 * On a hit we:
 *   1. Refresh the Wrapp counter one more time so we roll on a
 *      current number, not a 24h-stale one.
 *   2. Call embedded_check_user to confirm the tenant is actually
 *      still active with Wrapp (they might have cancelled, in which
 *      case we mark the local sub cancelled instead of renewing).
 *   3. Bump currentPeriodStart = now, currentPeriodEnd = now + 12mo,
 *      issuedCountBaseline = issuedCountUpstream.
 *   4. Audit-log `subscription.renewal` with the reason.
 *
 * Idempotent — running the cron twice in the same minute won't roll
 * twice because the second call sees the freshly-bumped currentPeriodEnd.
 */

const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;

export type RenewalResult = {
  scanned: number;
  renewed: number;
  cancelled: number;
  failed: number;
};

export async function detectAndRollRenewals(): Promise<RenewalResult> {
  const now = new Date();
  const subs = await prisma.businessSubscription.findMany({
    where: {
      status: { in: ["active", "trialing"] },
    },
    include: {
      plan: { select: { name: true, includedDocsMonth: true } },
      business: {
        select: {
          id: true,
          legalName: true,
          wrappConnection: {
            select: {
              issuedCountUpstream: true,
              issuedCountBaseline: true,
              issuedCountAt: true,
            },
          },
        },
      },
    },
  });

  let renewed = 0;
  let cancelled = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      const wc = sub.business.wrappConnection;
      const cap = sub.plan.includedDocsMonth;
      const upstream = wc?.issuedCountUpstream ?? 0;
      const baseline = wc?.issuedCountBaseline ?? 0;
      const usedInPeriod = Math.max(0, upstream - baseline);

      const timeTriggered = now.getTime() >= sub.currentPeriodEnd.getTime();
      const usageTriggered = cap > 0 && usedInPeriod >= cap;
      if (!timeTriggered && !usageTriggered) continue;

      // Refresh the upstream count so we roll on a current number.
      // Ignore failures — a slightly stale count doesn't invalidate
      // the trigger we've already computed.
      await reconcileWrappForBusiness(sub.businessId).catch((err) => {
        logger.warn("subscription.renewal.reconcile_failed", {
          businessId: sub.businessId,
          error: err instanceof Error ? err.message : String(err),
        });
      });

      // Confirm the tenant is still an active Wrapp customer before
      // we roll. If Wrapp says they've cancelled, mark the local sub
      // cancelled instead of extending it — extending a cancelled
      // customer would let them keep using the app past their paid
      // window.
      const partner = await getWrappPartnerClient();
      let stillActive = true;
      if (partner) {
        try {
          const check = await partner.embeddedCheckUser(sub.businessId);
          if (check.found && !check.activeSubscription) {
            stillActive = false;
          }
          // check.found=false means Wrapp doesn't know about this
          // partner_user_id — could be a pre-migration tenant. Don't
          // cancel on ambiguous "not found"; treat as still active
          // so we don't lock people out on a bad key.
        } catch (err) {
          logger.warn("subscription.renewal.check_user_failed", {
            businessId: sub.businessId,
            error: err instanceof Error ? err.message : String(err),
          });
          // Treat as still active — safer than cancelling on a
          // transient partner-API outage.
        }
      }

      if (!stillActive) {
        await prisma.businessSubscription.update({
          where: { id: sub.id },
          data: {
            status: "cancelled",
            cancelledAt: now,
          },
        });
        await logAudit({
          businessId: sub.businessId,
          action: "subscription.cancelled_by_provider",
          entityType: "BusinessSubscription",
          entityId: sub.id,
          meta: {
            planName: sub.plan.name,
            reason: "wrapp.embedded_check_user.active_subscription=false",
          },
        });
        cancelled += 1;
        continue;
      }

      // Roll: fresh 12-month window, baseline snapshotted to the
      // latest upstream count so the next period's usage starts at 0.
      // Re-read the connection because reconcileWrappForBusiness above
      // may have bumped upstream.
      const fresh = await prisma.wrappConnection
        .findUnique({
          where: { businessId: sub.businessId },
          select: { issuedCountUpstream: true },
        })
        .catch(() => null);
      const newBaseline = fresh?.issuedCountUpstream ?? upstream;

      const newPeriodStart = now;
      const newPeriodEnd = new Date(now.getTime() + TWELVE_MONTHS_MS);

      await prisma.$transaction([
        prisma.businessSubscription.update({
          where: { id: sub.id },
          data: {
            currentPeriodStart: newPeriodStart,
            currentPeriodEnd: newPeriodEnd,
            // Push nextBillingAt one period out too, matching the
            // renewal cadence.
            nextBillingAt: newPeriodEnd,
          },
        }),
        prisma.wrappConnection.update({
          where: { businessId: sub.businessId },
          data: { issuedCountBaseline: newBaseline },
        }),
      ]);

      await logAudit({
        businessId: sub.businessId,
        action: "subscription.renewal",
        entityType: "BusinessSubscription",
        entityId: sub.id,
        meta: {
          planName: sub.plan.name,
          reason: usageTriggered ? "usage_cap_hit" : "twelve_months_elapsed",
          previousBaseline: baseline,
          newBaseline,
          usedInPreviousPeriod: usedInPeriod,
          cap,
          newPeriodEnd: newPeriodEnd.toISOString(),
        },
      });

      renewed += 1;
    } catch (err) {
      failed += 1;
      logger.error("subscription.renewal.failed", err, {
        businessId: sub.businessId,
        subscriptionId: sub.id,
      });
    }
  }

  return { scanned: subs.length, renewed, cancelled, failed };
}
