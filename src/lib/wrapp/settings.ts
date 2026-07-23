import "server-only";
import { prisma } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { env } from "@/lib/env";

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
export async function getWrappSettings(): Promise<WrappSettings> {
  const [dbBase, dbPartner, dbStagingKey, dbStagingEmail, dbHook] = await Promise.all([
    readRaw(KEYS.baseUrl),
    readEncrypted(KEYS.partnerKey),
    readEncrypted(KEYS.stagingTenantKey),
    readRaw(KEYS.stagingTenantEmail),
    readEncrypted(KEYS.webhookSecret),
  ]);

  return {
    baseUrl: dbBase?.trim() || env.WRAPP_API_BASE_URL,
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
