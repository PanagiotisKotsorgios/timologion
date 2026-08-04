import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { withCronLog } from "@/lib/cron-logger";
import { evaluateAlertRules } from "@/lib/alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Run every N minutes (recommend 5). Cheap — each rule does one
 * count/read against the DB and only sends email when threshold is
 * crossed AND cooldown has expired.
 */
export async function GET(req: Request) {
  const unauth = authorizeCron(req);
  if (unauth) return unauth;
  const wrapped = await withCronLog("alerts", async () => {
    const res = await evaluateAlertRules();
    return { result: { ok: true, ...res }, itemsDone: res.fired };
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
