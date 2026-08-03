import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";
import { runBackup } from "@/lib/backup";
import { withCronLog } from "@/lib/cron-logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Cron-triggered database backup. Spawns `mysqldump`, gzips, streams to
 * S3-compatible storage. runBackup already writes to BackupRun; we
 * additionally log to CronRun so /admin/cron shows the entry alongside
 * every other scheduled job.
 */
export async function POST(req: Request): Promise<Response> {
  const auth = authorizeCron(req);
  if (auth) return auth;

  const wrapped = await withCronLog("backup", async () => {
    const res = await runBackup();
    if (!res.ok) throw new Error(res.error ?? "backup failed");
    return { result: res, itemsDone: 1 };
  });

  if (!wrapped.ok) {
    return NextResponse.json({ ok: false, error: wrapped.error }, { status: 500 });
  }
  return NextResponse.json(wrapped.result);
}

export const GET = POST;
