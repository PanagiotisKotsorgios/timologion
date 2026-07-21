import "server-only";
import { env } from "@/lib/env";
import { getEmailConfig } from "./config";

export type EmailRecipient = { email: string; name?: string };

export type SendEmailInput = {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
  tags?: string[];
};

export type SendEmailResult =
  | { ok: true; messageId?: string; dryRun?: boolean }
  | { ok: false; error: string; status?: number };

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Send a transactional email via Brevo. If the platform hasn't configured an
 * API key yet, the message is logged and a dry-run result is returned so the
 * app can still function in development.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const cfg = await getEmailConfig();
  const to = Array.isArray(input.to) ? input.to : [input.to];

  if (!cfg.hasApiKey || !cfg.apiKey) {
    if (env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.info(
        `[email:dry-run] to=${to.map((r) => r.email).join(",")} subject=${JSON.stringify(input.subject)}`,
      );
      return { ok: true, dryRun: true };
    }
    return {
      ok: false,
      error: "Δεν έχει ρυθμιστεί ο πάροχος αποστολής email.",
    };
  }

  try {
    const res = await fetch(BREVO_URL, {
      method: "POST",
      headers: {
        "api-key": cfg.apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: cfg.senderEmail, name: cfg.senderName },
        replyTo: cfg.replyTo ? { email: cfg.replyTo } : undefined,
        to: to.map((r) => ({ email: r.email, name: r.name })),
        subject: input.subject,
        htmlContent: input.html,
        textContent: input.text,
        tags: input.tags,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        ok: false,
        error: `Brevo ${res.status}: ${body.slice(0, 240)}`,
        status: res.status,
      };
    }

    const json = (await res.json()) as { messageId?: string };
    return { ok: true, messageId: json.messageId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Άγνωστο σφάλμα Brevo.",
    };
  }
}
