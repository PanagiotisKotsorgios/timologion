import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { runBackup } from "@/lib/backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// mysqldump on a real DB can take minutes; disable the default timeout.
export const maxDuration = 300;

/**
 * Cron-triggered database backup. Spawns `mysqldump`, gzips, streams to
 * S3-compatible storage, records the run in BackupRun.
 *
 * Set BACKUP_S3_ENDPOINT / BUCKET / ACCESS_KEY_ID / SECRET_ACCESS_KEY
 * and hit `POST /api/cron/backup` daily with the CRON_SECRET as Bearer.
 * Coolify's cron scheduler or an external cron works either way — the
 * route is stateless from the caller's perspective.
 */
export async function POST(req: Request): Promise<Response> {
  const auth = authorizeCron(req);
  if (auth) return auth;

  const res = await runBackup();
  if (!res.ok) {
    return NextResponse.json(res, { status: 500 });
  }
  return NextResponse.json(res);
}

// GET returns the same result — handy for one-off manual runs from a
// browser DevTools console with a bearer token.
export const GET = POST;
