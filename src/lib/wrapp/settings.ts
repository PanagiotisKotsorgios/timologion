import "server-only";
import { prisma } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Wrapp platform-wide credentials, stored in AppSetting rows so a
 * super_admin can configure them from the UI (no env var editing needed
 * on Coolify).
 *
 * Values fall back to env vars if the DB row is empty — that way a fresh
 * deploy that already has the env set continues to work, and edits from
 * the admin UI take precedence going forward.
 *
 * Sensitive fields (api keys, webhook secret) are encrypted at rest with
 * AES-256-GCM via encryptSecret/decryptSecret. Non-sensitive fields
 * (base URL, tenant email) are stored plaintext.
 */

const KEYS = {
  baseUrl: "wrapp_api_base_url",
  partnerKey: "wrapp_partner_api_key_enc",
  stagingTenantKey: "wrapp_staging_tenant_api_key_enc",
  stagingTenantEmail: "wrapp_staging_tenant_email",
  webhookSecret: "wrapp_webhook_secret_enc",
} as const;

async function readRaw(key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

async function readEncrypted(key: string): Promise<string | null> {
  const raw = await readRaw(key);
  if (!raw) return null;
  return decryptSecret(raw);
}

async function writeEncrypted(key: string, value: string): Promise<void> {
  const encrypted = value ? encryptSecret(value) : "";
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value: encrypted, description: "Wrapp credential" },
    update: { value: encrypted },
  });
}

async function writePlain(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value, description: "Wrapp configuration" },
    update: { value },
  });
}

export type WrappSettings = {
  baseUrl: string;
  partnerApiKey: string;
  stagingTenantApiKey: string;
  stagingTenantEmail: string;
  webhookSecret: string;
};

/**
 * Resolve the effective Wrapp settings. DB values win; empty/missing DB
 * values fall through to env. Both null/undefined/empty are treated as
 * unset.
 */
/**
 * Ensure the base URL includes the `/api/v1` version segment. Different
 * historical configs stored either `https://staging.wrapp.ai` or the same
 * with `/api/v1` appended; every endpoint call assumes `/api/v1` is part of
 * the base, so we normalize once here.
 */
function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.replace(/\/+$/, "");
  if (/\/api\/v\d+$/.test(trimmed)) return trimmed;
  return `${trimmed}/api/v1`;
}

// Wrapp's canonical URLs — matched via hostname so a trailing /api/v1,
// http vs https, or a stray trailing slash can't confuse the classifier.
const PROD_HOST = "wrapp.ai";
const STAGING_HOST = "staging.wrapp.ai";

export type WrappEnvironment = "production" | "staging" | "unknown";

/** Classify a Wrapp base URL. `unknown` covers self-hosted / tunneled
 *  mirrors that a developer might point at. Never throws — returns
 *  `unknown` for anything unparseable. */
export function classifyBaseUrl(raw: string): WrappEnvironment {
  try {
    const host = new URL(raw).hostname.toLowerCase();
    if (host === STAGING_HOST) return "staging";
    if (host === PROD_HOST) return "production";
    return "unknown";
  } catch {
    return "unknown";
  }
}

export const WRAPP_PRODUCTION_BASE_URL = `https://${PROD_HOST}/api/v1`;
export const WRAPP_STAGING_BASE_URL = `https://${STAGING_HOST}/api/v1`;

// Warn-once flag — we don't want a hot path (every Wrapp call) to spam
// logs with the same message. First resolve of a settings object per
// process is enough for on-call to notice the mismatch.
let mismatchWarnedFor: string | null = null;

function warnOnEnvMismatchOnce(effectiveBaseUrl: string): void {
  const key = `${env.NODE_ENV}::${effectiveBaseUrl}`;
  if (mismatchWarnedFor === key) return;
  const wrappEnv = classifyBaseUrl(effectiveBaseUrl);
  if (
    (env.NODE_ENV === "production" && wrappEnv === "staging") ||
    (env.NODE_ENV !== "production" && wrappEnv === "production")
  ) {
    logger.warn("wrapp.env.mismatch", {
      nodeEnv: env.NODE_ENV,
      wrappEnv,
      baseUrl: effectiveBaseUrl,
    });
    mismatchWarnedFor = key;
  } else {
    // Reset the memo so a subsequent swap re-warns if the operator
    // toggles back into a mismatched state.
    mismatchWarnedFor = null;
  }
}

export async function getWrappSettings(): Promise<WrappSettings> {
  const [dbBase, dbPartner, dbStagingKey, dbStagingEmail, dbHook] = await Promise.all([
    readRaw(KEYS.baseUrl),
    readEncrypted(KEYS.partnerKey),
    readEncrypted(KEYS.stagingTenantKey),
    readRaw(KEYS.stagingTenantEmail),
    readEncrypted(KEYS.webhookSecret),
  ]);

  const baseUrl = normalizeBaseUrl(dbBase?.trim() || env.WRAPP_API_BASE_URL);
  warnOnEnvMismatchOnce(baseUrl);

  return {
    baseUrl,
    partnerApiKey: dbPartner?.trim() || env.WRAPP_PARTNER_API_KEY,
    stagingTenantApiKey:
      dbStagingKey?.trim() || env.WRAPP_STAGING_TENANT_API_KEY,
    stagingTenantEmail:
      dbStagingEmail?.trim() || env.WRAPP_STAGING_TENANT_EMAIL,
    webhookSecret: dbHook?.trim() || env.WRAPP_WEBHOOK_SECRET,
  };
}

/**
 * Same as getWrappSettings but hides sensitive values with a placeholder,
 * suitable for pre-filling an admin form without leaking secrets. Callers
 * should treat empty string in a secret field as "no change" on save.
 */
export async function getWrappSettingsForForm(): Promise<{
  baseUrl: string;
  partnerApiKeySet: boolean;
  stagingTenantApiKeySet: boolean;
  stagingTenantEmail: string;
  webhookSecretSet: boolean;
  fallbackFromEnv: {
    partnerApiKey: boolean;
    stagingTenantApiKey: boolean;
    webhookSecret: boolean;
  };
}> {
  const [dbBase, dbPartner, dbStagingKey, dbStagingEmail, dbHook] = await Promise.all([
    readRaw(KEYS.baseUrl),
    readEncrypted(KEYS.partnerKey),
    readEncrypted(KEYS.stagingTenantKey),
    readRaw(KEYS.stagingTenantEmail),
    readEncrypted(KEYS.webhookSecret),
  ]);

  return {
    baseUrl: dbBase?.trim() || env.WRAPP_API_BASE_URL,
    partnerApiKeySet: Boolean(dbPartner?.trim()),
    stagingTenantApiKeySet: Boolean(dbStagingKey?.trim()),
    stagingTenantEmail:
      dbStagingEmail?.trim() || env.WRAPP_STAGING_TENANT_EMAIL,
    webhookSecretSet: Boolean(dbHook?.trim()),
    fallbackFromEnv: {
      partnerApiKey: !dbPartner?.trim() && Boolean(env.WRAPP_PARTNER_API_KEY),
      stagingTenantApiKey:
        !dbStagingKey?.trim() && Boolean(env.WRAPP_STAGING_TENANT_API_KEY),
      webhookSecret: !dbHook?.trim() && Boolean(env.WRAPP_WEBHOOK_SECRET),
    },
  };
}

export type SaveInput = {
  baseUrl?: string;
  partnerApiKey?: string; // empty string = leave unchanged
  stagingTenantApiKey?: string;
  stagingTenantEmail?: string;
  webhookSecret?: string;
  // Explicit clear flags — set to true to wipe the corresponding secret.
  clearPartnerApiKey?: boolean;
  clearStagingTenantApiKey?: boolean;
  clearWebhookSecret?: boolean;
};

export async function saveWrappSettings(input: SaveInput): Promise<void> {
  if (input.baseUrl !== undefined && input.baseUrl.trim().length > 0) {
    await writePlain(KEYS.baseUrl, input.baseUrl.trim());
  }

  if (input.clearPartnerApiKey) {
    await writeEncrypted(KEYS.partnerKey, "");
  } else if (input.partnerApiKey && input.partnerApiKey.trim().length > 0) {
    await writeEncrypted(KEYS.partnerKey, input.partnerApiKey.trim());
  }

  if (input.clearStagingTenantApiKey) {
    await writeEncrypted(KEYS.stagingTenantKey, "");
  } else if (
    input.stagingTenantApiKey &&
    input.stagingTenantApiKey.trim().length > 0
  ) {
    await writeEncrypted(KEYS.stagingTenantKey, input.stagingTenantApiKey.trim());
  }

  if (input.stagingTenantEmail !== undefined) {
    await writePlain(KEYS.stagingTenantEmail, input.stagingTenantEmail.trim());
  }

  if (input.clearWebhookSecret) {
    await writeEncrypted(KEYS.webhookSecret, "");
  } else if (input.webhookSecret && input.webhookSecret.trim().length > 0) {
    await writeEncrypted(KEYS.webhookSecret, input.webhookSecret.trim());
  }
}
