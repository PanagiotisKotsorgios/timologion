import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { withCronLog } from "@/lib/cron-logger";
import { reconcileAllWrappTenants } from "@/lib/wrapp/reconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A big tenant base + sequential per-tenant call could take a few
// minutes; give ourselves runway.
export const maxDuration = 300;

/**
 * Nightly Wrapp reconciliation. For every business with a Wrapp
 * connection we call /tenant_details + /invoices/issued_count and
 * write the answers onto WrappConnection so the tenant dashboard +
 * subscription page + admin can show fresh state without an API hit
 * per page render.
 *
 * Bearer-auth via the shared CRON_SECRET.
 */
export async function GET(req: Request) {
  const unauth = authorizeCron(req);
  if (unauth) return unauth;
  const wrapped = await withCronLog("wrapp-reconcile", async () => {
    const res = await reconcileAllWrappTenants();
    return {
      result: {
        ok: true,
        scanned: res.scanned,
        succeeded: res.ok,
        failed: res.failed,
      },
      itemsDone: res.ok,
    };
  });
  if (!wrapped.ok) {
    return NextResponse.json(
      { ok: false, error: wrapped.error },
      { status: 500 },
    );
  }
  return NextResponse.json(wrapped.result);
}

export const POST = GET;
