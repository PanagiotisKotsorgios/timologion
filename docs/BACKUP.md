# Database backups

The app ships a self-contained cron endpoint that streams a full
`mysqldump` (gzipped) to any S3-compatible object storage. It is the
production backup path — Coolify's built-in DB snapshots are a fine
belt-and-suspenders complement but not a substitute, because they live
on the same infrastructure the DB does.

## What runs

`POST /api/cron/backup` (Bearer `CRON_SECRET`) spawns:

```
mysqldump --single-transaction --quick --routines --triggers  |  gzip -c  |  S3 PutObject
```

Each run appends a row to the `backup_runs` table. Success rows record
the compressed byte count + duration + the S3 target key. Failure rows
carry the stderr snippet.

## Configuration

Set these env vars on the production deployment:

| Variable | Example | Purpose |
|---|---|---|
| `CRON_SECRET` | `openssl rand -hex 32` | Bearer token the caller passes |
| `BACKUP_S3_ENDPOINT` | `https://s3.eu-central-003.backblazeb2.com` | Storage endpoint |
| `BACKUP_S3_REGION` | `eu-central-003` (or `auto` for R2) | Region |
| `BACKUP_S3_BUCKET` | `timologion-backups` | Target bucket |
| `BACKUP_S3_ACCESS_KEY_ID` | | Storage credentials |
| `BACKUP_S3_SECRET_ACCESS_KEY` | | Storage credentials |
| `BACKUP_RETENTION_DAYS` | `90` | Prune `backup_runs` rows older than N (0 = keep all) |

The route enforces its own auth via `CRON_SECRET`. If any of the
storage vars are missing, `runBackup()` throws before touching the DB.

## Runtime requirements

The container image must have `mysqldump` and `gzip` on `$PATH`. Both
ship in the standard `mysql-client` / `default-mysql-client` packages
and in `busybox`. Add a `Dockerfile` line like:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    default-mysql-client gzip && rm -rf /var/lib/apt/lists/*
```

## Scheduling on Coolify

Coolify has a "Scheduled Tasks" panel per application. Add:

- **Frequency:** `0 3 * * *` (03:00 daily UTC)
- **Command:** `curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" $APP_BASE_URL/api/cron/backup`

External services (cron-job.org, EasyCron, GitHub Actions) work the
same way — hit the URL with the bearer.

## Object storage recommendations

For a small Greek SaaS the cheapest reliable options are:

- **Backblaze B2** (eu-central-003) — $0.006/GB/month, no egress fees to
  Cloudflare, S3-compatible.
- **Cloudflare R2** — $0.015/GB/month, zero egress, S3-compatible.
- **Wasabi** — $0.007/GB/month, no egress, minimum storage duration
  billing (careful with retention).

Enable a lifecycle rule on the bucket to auto-delete objects after
your retention window (e.g., 90 days). The `BACKUP_RETENTION_DAYS`
env only prunes the DB rows — actual object expiration should be
enforced by the bucket itself.

## Restore drill

Backups you don't test aren't backups. Once a quarter:

1. Download the latest `.sql.gz` from S3.
2. `gunzip -c dump.sql.gz | mysql -h ... -u ... -p $DBNAME_restore`
   into a scratch database.
3. Spot-check row counts: `SELECT COUNT(*) FROM documents;` vs
   production.
4. Log the drill in the audit log so ops has proof.

## Monitoring

The admin dashboard at `/admin/backups` shows the last successful run,
the last failure, and the last 50 attempts. Set an uptime monitor
(`UptimeRobot`, `Cronitor`) to hit the endpoint's success return
weekly if you want an external heartbeat — a silent-failing cron is
the classic backup gotcha.
