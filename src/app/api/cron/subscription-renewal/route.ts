import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { withCronLog } from "@/lib/cron-logger";
import { detectAndRollRenewals } from "@/lib/subscription-renewal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Daily subscription renewal detection.
 *
 * Iterates active + trialing BusinessSubscription rows. For each,
 * detectAndRollRenewals() checks two triggers (12-month rollover or
 * annual docs cap reached), refreshes Wrapp's counter, confirms the
 * tenant is still active with Wrapp via embedded_check_user, and
 * either rolls to a new 12-month period or marks the sub cancelled.
 *
 * Registered in docker-compose cron sidecar at 03:45 daily — after
 * the 02:30 wrapp-reconcile so the upstream counter is already
 * fresh when we make the roll decision.
 *
 * Bearer-auth via the shared CRON_SECRET.
 */
export async function GET(req: Request) {
  const unauth = authorizeCron(req);
  if (unauth) return unauth;
  const wrapped = await withCronLog("subscription-renewal", async () => {
    const res = await detectAndRollRenewals();
    return {
      result: { ok: true, ...res },
      itemsDone: res.renewed + res.cancelled,
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
