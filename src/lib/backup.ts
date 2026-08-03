import "server-only";
import { spawn } from "node:child_process";
import { PassThrough } from "node:stream";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Parse a mysql:// or mysql://user:pass@host:port/db URL into the pieces
 * mysqldump needs. Prisma accepts both plain and encoded passwords, so
 * we let the URL API normalize.
 */
function parseDbUrl(url: string): {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
} {
  const u = new URL(url);
  const database = u.pathname.replace(/^\//, "");
  if (!database) throw new Error("DATABASE_URL missing database name");
  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database,
  };
}

export type BackupResult = {
  ok: boolean;
  bytes: number;
  durationMs: number;
  target: string;
  error?: string;
};

/**
 * Spawn mysqldump and stream its stdout straight into S3 via multipart
 * upload. Never buffers the whole dump in memory — a 1GB tenant DB
 * would OOM otherwise. Compression happens client-side (mysqldump has
 * no built-in compression); we prepend `--single-transaction` so we
 * get a consistent snapshot without locking write traffic.
 */
export async function runBackup(): Promise<BackupResult> {
  const started = Date.now();

  if (
    !env.BACKUP_S3_ENDPOINT ||
    !env.BACKUP_S3_BUCKET ||
    !env.BACKUP_S3_ACCESS_KEY_ID ||
    !env.BACKUP_S3_SECRET_ACCESS_KEY
  ) {
    throw new Error(
      "Backup storage not configured — set BACKUP_S3_* env vars.",
    );
  }

  const db = parseDbUrl(env.DATABASE_URL);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const key = `${db.database}/${stamp}.sql.gz`;
  const target = `s3://${env.BACKUP_S3_BUCKET}/${key}`;

  const run = await prisma.backupRun.create({
    data: { status: "running", target, startedAt: new Date(started) },
  });

  try {
    const s3 = new S3Client({
      endpoint: env.BACKUP_S3_ENDPOINT,
      region: env.BACKUP_S3_REGION,
      credentials: {
        accessKeyId: env.BACKUP_S3_ACCESS_KEY_ID,
        secretAccessKey: env.BACKUP_S3_SECRET_ACCESS_KEY,
      },
      // Backblaze B2 / Wasabi / R2 all speak path-style, not virtual-hosted.
      forcePathStyle: true,
    });

    // mysqldump | gzip → passthrough → S3.
    // We count bytes on the passthrough so BackupRun.bytes gets an
    // accurate compressed-size figure.
    const dump = spawn(
      "mysqldump",
      [
        `--host=${db.host}`,
        `--port=${db.port}`,
        `--user=${db.user}`,
        `--password=${db.password}`,
        "--single-transaction",
        "--quick",
        "--routines",
        "--triggers",
        "--set-gtid-purged=OFF",
        db.database,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    const gzip = spawn("gzip", ["-c"], { stdio: ["pipe", "pipe", "pipe"] });
    dump.stdout.pipe(gzip.stdin);

    const measured = new PassThrough();
    let byteCount = 0;
    measured.on("data", (chunk: Buffer) => {
      byteCount += chunk.length;
    });
    gzip.stdout.pipe(measured);

    // Buffer stderr from both subprocesses so we can attach it to a failure.
    const errs: string[] = [];
    dump.stderr.on("data", (c: Buffer) => errs.push(c.toString()));
    gzip.stderr.on("data", (c: Buffer) => errs.push(c.toString()));

    const dumpExit = new Promise<number>((resolve) =>
      dump.on("close", (code) => resolve(code ?? 0)),
    );
    const gzipExit = new Promise<number>((resolve) =>
      gzip.on("close", (code) => resolve(code ?? 0)),
    );

    // Note: PutObjectCommand streams the body. If your object is larger
    // than the SDK's automatic multipart threshold you'd switch to
    // @aws-sdk/lib-storage's Upload; for typical SaaS tenant dumps
    // (< 5GB) PutObjectCommand is fine.
    await s3.send(
      new PutObjectCommand({
        Bucket: env.BACKUP_S3_BUCKET,
        Key: key,
        Body: measured,
        ContentType: "application/gzip",
      }),
    );

    const [dumpCode, gzipCode] = await Promise.all([dumpExit, gzipExit]);
    if (dumpCode !== 0 || gzipCode !== 0) {
      throw new Error(
        `Dump failed: mysqldump=${dumpCode} gzip=${gzipCode} · ${errs.join(" ").slice(0, 500)}`,
      );
    }

    const durationMs = Date.now() - started;
    await prisma.backupRun.update({
      where: { id: run.id },
      data: {
        status: "success",
        bytes: BigInt(byteCount),
        durationMs,
        finishedAt: new Date(),
      },
    });

    // Retention: drop old BackupRun rows and (out of scope here) rely on
    // S3 lifecycle policy for actual object expiration.
    if (env.BACKUP_RETENTION_DAYS > 0) {
      const cutoff = new Date(
        Date.now() - env.BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      );
      await prisma.backupRun
        .deleteMany({ where: { startedAt: { lt: cutoff } } })
        .catch(() => undefined);
    }

    return { ok: true, bytes: byteCount, durationMs, target };
  } catch (err) {
    const durationMs = Date.now() - started;
    const message = err instanceof Error ? err.message : String(err);
    await prisma.backupRun
      .update({
        where: { id: run.id },
        data: {
          status: "failed",
          durationMs,
          finishedAt: new Date(),
          error: message.slice(0, 8000),
        },
      })
      .catch(() => undefined);
    logger.error("backup.run_failed", err, { target });
    return { ok: false, bytes: 0, durationMs, target, error: message };
  }
}
