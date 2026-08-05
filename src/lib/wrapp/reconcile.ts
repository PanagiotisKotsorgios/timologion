import "server-only";
import { prisma } from "@/lib/db";
import { getWrappClient } from "@/lib/wrapp/client";
import { logger } from "@/lib/logger";

/**
 * Refresh Wrapp state for a single business — the endpoint hits
 * `/tenant_details` (yes/no plan, issue permission) + `/invoices/issued_count`
 * (upstream authoritative usage counter) and writes them onto
 * WrappConnection. Best-effort — a failure logs but doesn't throw so
 * the outer bulk reconciler keeps going.
 */
export async function reconcileWrappForBusiness(
  businessId: string,
): Promise<{
  ok: boolean;
  hasPlan?: boolean;
  canIssue?: boolean;
  issuedCount?: number;
  error?: string;
}> {
  try {
    const client = getWrappClient();
    const [details, issued] = await Promise.all([
      client.getTenantDetails(businessId).catch((err) => {
        throw new Error(
          err instanceof Error ? err.message : "tenant_details_failed",
        );
      }),
      client.issuedCount(businessId).catch(() => null),
    ]);

    const now = new Date();
    await prisma.wrappConnection.update({
      where: { businessId },
      data: {
        hasPlan: details.has_plan,
        canIssueInvoice: details.issue_invoice_status,
        wrappUserId: details.wrapp_user_id ?? undefined,
        wrappEmail: details.email ?? undefined,
        lastVerifiedAt: now,
        lastError: null,
        // Only update the counter when Wrapp actually answered — a
        // null from a transient error shouldn't zero out a valid cached
        // value.
        ...(issued != null
          ? {
              issuedCountUpstream: issued,
              issuedCountAt: now,
            }
          : {}),
        status: details.has_plan && details.issue_invoice_status
          ? "active"
          : details.has_plan
            ? "pending"
            : "inactive",
      },
    });

    return {
      ok: true,
      hasPlan: details.has_plan,
      canIssue: details.issue_invoice_status,
      issuedCount: issued ?? undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Write the failure onto the row so /admin/businesses and the
    // tenant Wrapp settings page both surface the reason.
    await prisma.wrappConnection
      .update({
        where: { businessId },
        data: {
          lastError: message.slice(0, 4000),
          lastVerifiedAt: new Date(),
          status: "error",
        },
      })
      .catch(() => undefined);
    logger.error("wrapp.reconcile.failed", err, { businessId });
    return { ok: false, error: message };
  }
}

/**
 * Bulk reconciliation — walks every business that has a WrappConnection
 * row and reconciles it. Called by /api/cron/wrapp-reconcile nightly.
 * Runs sequentially (not parallel) to avoid hammering the provider's
 * partner rate limits.
 */
export async function reconcileAllWrappTenants(): Promise<{
  scanned: number;
  ok: number;
  failed: number;
}> {
  const connections = await prisma.wrappConnection.findMany({
    where: {
      // Skip disconnected tenants — the reconcile would just error out
      // and we'd spam the error log.
      encryptedApiKey: { not: null },
    },
    select: { businessId: true },
    take: 5000,
  });

  let ok = 0;
  let failed = 0;
  for (const c of connections) {
    const res = await reconcileWrappForBusiness(c.businessId);
    if (res.ok) ok++;
    else failed++;
  }
  return { scanned: connections.length, ok, failed };
}
