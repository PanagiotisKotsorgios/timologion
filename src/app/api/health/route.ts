import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lightweight liveness + readiness probe.
 *   Liveness:  did the process boot? (implicit — reaching this handler)
 *   Readiness: can we still round-trip to the DB? (SELECT 1)
 *
 * Coolify's Traefik uses this to decide when to send traffic; the
 * cron sidecar hits nothing here directly but the same URL doubles as
 * an uptime-monitor target.
 *
 * Returns 200 with `{ ok: true, db_ms }` when reachable, 503 when the
 * DB round-trip fails. Never caches — must reflect the current state.
 */
export async function GET() {
  const t0 = Date.now();
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return NextResponse.json(
      {
        ok: true,
        db_ms: Date.now() - t0,
        ts: new Date().toISOString(),
      },
      {
        status: 200,
        headers: { "cache-control": "no-store" },
      },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "db_unreachable",
        ts: new Date().toISOString(),
      },
      {
        status: 503,
        headers: { "cache-control": "no-store" },
      },
    );
  }
}

// HEAD version so container healthchecks / uptime monitors can probe
// without pulling the JSON body every 15 seconds.
export async function HEAD() {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return new NextResponse(null, {
      status: 200,
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return new NextResponse(null, {
      status: 503,
      headers: { "cache-control": "no-store" },
    });
  }
}
