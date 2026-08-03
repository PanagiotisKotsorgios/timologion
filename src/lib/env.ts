import { z } from "zod";
// Register the Greek Zod error map globally as soon as any server module boots.
import "./zod-el";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),
  WRAPP_API_BASE_URL: z.string().url().default("https://staging.wrapp.ai/api/v1"),
  WRAPP_API_KEY: z.string().optional().default(""),
  // Partners API key (X-PARTNER-API-KEY header) — used for external_login and
  // embedded_check_user onboarding endpoints. Distinct from the tenant api_key.
  WRAPP_PARTNER_API_KEY: z.string().optional().default(""),
  // Fallback tenant credentials for staging: when a Business hasn't completed
  // Wrapp onboarding, we can still exercise the full API using these.
  WRAPP_STAGING_TENANT_API_KEY: z.string().optional().default(""),
  WRAPP_STAGING_TENANT_EMAIL: z.string().optional().default(""),
  // Optional webhook secret to enforce beyond HMAC(api_key). Left empty and
  // the receiver falls back to the api_key HMAC scheme documented by Wrapp.
  WRAPP_WEBHOOK_SECRET: z.string().optional().default(""),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  FACEBOOK_APP_ID: z.string().optional().default(""),
  FACEBOOK_APP_SECRET: z.string().optional().default(""),
  SENTRY_DSN: z.string().optional().default(""),
  CRON_SECRET: z.string().optional().default(""),
  // Backup target — S3-compatible object storage (Backblaze B2, R2, Wasabi,
  // AWS S3, MinIO). All five must be set for /api/cron/backup to run.
  BACKUP_S3_ENDPOINT: z.string().optional().default(""),
  BACKUP_S3_REGION: z.string().optional().default("auto"),
  BACKUP_S3_BUCKET: z.string().optional().default(""),
  BACKUP_S3_ACCESS_KEY_ID: z.string().optional().default(""),
  BACKUP_S3_SECRET_ACCESS_KEY: z.string().optional().default(""),
  // Retention window for BackupRun rows (default: forever). Prune runs
  // older than N days from the /admin/backups page cron. 0 = keep all.
  BACKUP_RETENTION_DAYS: z.coerce.number().optional().default(0),
  // Comma-separated IP CIDRs allowed to reach /admin. Empty = no
  // restriction. Example: "10.0.0.0/8,203.0.113.5/32". IPv6 works too.
  ADMIN_IP_ALLOWLIST: z.string().optional().default(""),
  // When "true", any admin session without an active 2FA setup is
  // redirected to /app/settings/security to enable it before proceeding.
  ADMIN_REQUIRE_2FA: z.string().optional().default(""),
  // Free-form label rendered as a strip at the top of /admin — e.g.
  // "STAGING", "LOCAL DEV", "DR-REPLICA". Empty in production.
  ENVIRONMENT_LABEL: z.string().optional().default(""),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const parsed = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  WRAPP_API_BASE_URL: process.env.WRAPP_API_BASE_URL,
  WRAPP_API_KEY: process.env.WRAPP_API_KEY,
  WRAPP_PARTNER_API_KEY: process.env.WRAPP_PARTNER_API_KEY,
  WRAPP_STAGING_TENANT_API_KEY: process.env.WRAPP_STAGING_TENANT_API_KEY,
  WRAPP_STAGING_TENANT_EMAIL: process.env.WRAPP_STAGING_TENANT_EMAIL,
  WRAPP_WEBHOOK_SECRET: process.env.WRAPP_WEBHOOK_SECRET,
  APP_BASE_URL: process.env.APP_BASE_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
  FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,
  SENTRY_DSN: process.env.SENTRY_DSN,
  CRON_SECRET: process.env.CRON_SECRET,
  BACKUP_S3_ENDPOINT: process.env.BACKUP_S3_ENDPOINT,
  BACKUP_S3_REGION: process.env.BACKUP_S3_REGION,
  BACKUP_S3_BUCKET: process.env.BACKUP_S3_BUCKET,
  BACKUP_S3_ACCESS_KEY_ID: process.env.BACKUP_S3_ACCESS_KEY_ID,
  BACKUP_S3_SECRET_ACCESS_KEY: process.env.BACKUP_S3_SECRET_ACCESS_KEY,
  BACKUP_RETENTION_DAYS: process.env.BACKUP_RETENTION_DAYS,
  ADMIN_IP_ALLOWLIST: process.env.ADMIN_IP_ALLOWLIST,
  ADMIN_REQUIRE_2FA: process.env.ADMIN_REQUIRE_2FA,
  ENVIRONMENT_LABEL: process.env.ENVIRONMENT_LABEL,
  NODE_ENV: process.env.NODE_ENV,
});

if (!parsed.success) {
  // Surface once at boot; do not throw during build if unset (Next builds without .env).
  if (process.env.NODE_ENV === "production") {
    // eslint-disable-next-line no-console
    console.error("Invalid environment", parsed.error.flatten().fieldErrors);
  }
}

export const env = parsed.success
  ? parsed.data
  : {
      DATABASE_URL: process.env.DATABASE_URL ?? "",
      SESSION_SECRET:
        process.env.SESSION_SECRET ?? "dev-insecure-secret-please-override-32b",
      WRAPP_API_BASE_URL:
        process.env.WRAPP_API_BASE_URL ?? "https://staging.wrapp.ai/api/v1",
      WRAPP_API_KEY: process.env.WRAPP_API_KEY ?? "",
      WRAPP_PARTNER_API_KEY: process.env.WRAPP_PARTNER_API_KEY ?? "",
      WRAPP_STAGING_TENANT_API_KEY: process.env.WRAPP_STAGING_TENANT_API_KEY ?? "",
      WRAPP_STAGING_TENANT_EMAIL: process.env.WRAPP_STAGING_TENANT_EMAIL ?? "",
      WRAPP_WEBHOOK_SECRET: process.env.WRAPP_WEBHOOK_SECRET ?? "",
      APP_BASE_URL: process.env.APP_BASE_URL ?? "http://localhost:3000",
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",
      FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID ?? "",
      FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET ?? "",
      SENTRY_DSN: process.env.SENTRY_DSN ?? "",
      CRON_SECRET: process.env.CRON_SECRET ?? "",
      BACKUP_S3_ENDPOINT: process.env.BACKUP_S3_ENDPOINT ?? "",
      BACKUP_S3_REGION: process.env.BACKUP_S3_REGION ?? "auto",
      BACKUP_S3_BUCKET: process.env.BACKUP_S3_BUCKET ?? "",
      BACKUP_S3_ACCESS_KEY_ID: process.env.BACKUP_S3_ACCESS_KEY_ID ?? "",
      BACKUP_S3_SECRET_ACCESS_KEY:
        process.env.BACKUP_S3_SECRET_ACCESS_KEY ?? "",
      BACKUP_RETENTION_DAYS: process.env.BACKUP_RETENTION_DAYS
        ? Number(process.env.BACKUP_RETENTION_DAYS)
        : 0,
      ADMIN_IP_ALLOWLIST: process.env.ADMIN_IP_ALLOWLIST ?? "",
      ADMIN_REQUIRE_2FA: process.env.ADMIN_REQUIRE_2FA ?? "",
      ENVIRONMENT_LABEL: process.env.ENVIRONMENT_LABEL ?? "",
      NODE_ENV: (process.env.NODE_ENV as
        | "development"
        | "test"
        | "production") ?? "development",
    };
