import "server-only";
import { prisma } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

// AppSetting keys used for the platform's transactional email configuration.
const K_API = "brevo_api_key_encrypted";
const K_SENDER_EMAIL = "brevo_sender_email";
const K_SENDER_NAME = "brevo_sender_name";
const K_REPLY_TO = "brevo_reply_to";
const K_LAST_VERIFIED = "brevo_last_verified_at";

export type EmailConfig = {
  apiKey: string | null;
  senderEmail: string;
  senderName: string;
  replyTo: string | null;
  hasApiKey: boolean;
  lastVerifiedAt: Date | null;
};

export async function getEmailConfig(): Promise<EmailConfig> {
  const rows = await prisma.appSetting.findMany({
    where: {
      key: {
        in: [K_API, K_SENDER_EMAIL, K_SENDER_NAME, K_REPLY_TO, K_LAST_VERIFIED],
      },
    },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const enc = map.get(K_API);
  const apiKey = enc ? decryptSecret(enc) : null;

  return {
    apiKey,
    senderEmail: map.get(K_SENDER_EMAIL) ?? "noreply@timologion.gr",
    senderName: map.get(K_SENDER_NAME) ?? "timologion",
    replyTo: map.get(K_REPLY_TO) ?? null,
    hasApiKey: Boolean(apiKey),
    lastVerifiedAt: map.get(K_LAST_VERIFIED)
      ? new Date(map.get(K_LAST_VERIFIED)!)
      : null,
  };
}

export async function saveEmailConfig(input: {
  apiKey?: string; // if empty, don't touch
  senderEmail: string;
  senderName: string;
  replyTo?: string | null;
}) {
  const ops: { key: string; value: string; description?: string }[] = [];

  if (input.apiKey && input.apiKey.trim().length > 0) {
    ops.push({
      key: K_API,
      value: encryptSecret(input.apiKey.trim()),
      description: "Brevo transactional API key (encrypted)",
    });
  }
  ops.push({
    key: K_SENDER_EMAIL,
    value: input.senderEmail.trim(),
    description: "From-address for outgoing platform email",
  });
  ops.push({
    key: K_SENDER_NAME,
    value: input.senderName.trim() || "timologion",
    description: "From-name for outgoing platform email",
  });
  ops.push({
    key: K_REPLY_TO,
    value: (input.replyTo ?? "").trim(),
    description: "Optional reply-to address",
  });

  await prisma.$transaction(
    ops.map((o) =>
      prisma.appSetting.upsert({
        where: { key: o.key },
        create: { key: o.key, value: o.value, description: o.description },
        update: { value: o.value, description: o.description },
      }),
    ),
  );
}

export async function clearEmailConfigApiKey() {
  await prisma.appSetting.deleteMany({ where: { key: K_API } });
}

export async function markEmailConfigVerified() {
  await prisma.appSetting.upsert({
    where: { key: K_LAST_VERIFIED },
    create: { key: K_LAST_VERIFIED, value: new Date().toISOString() },
    update: { value: new Date().toISOString() },
  });
}
