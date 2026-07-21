"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { formatZodError } from "@/lib/zod-el";
import {
  saveEmailConfig,
  clearEmailConfigApiKey,
  markEmailConfigVerified,
} from "@/lib/email/config";
import { sendEmail } from "@/lib/email/send";
import { testEmailTemplate } from "@/lib/email/templates";

const configSchema = z.object({
  apiKey: z.string().optional().or(z.literal("")),
  senderEmail: z.string().email(),
  senderName: z.string().min(1).max(120),
  replyTo: z.string().email().optional().or(z.literal("")),
});

export type EmailSettingsState =
  | { error?: string; success?: string }
  | undefined;

export async function saveEmailSettingsAction(
  _prev: EmailSettingsState,
  formData: FormData,
): Promise<EmailSettingsState> {
  const ctx = await requireAdmin("super_admin");
  const parsed = configSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  await saveEmailConfig({
    apiKey: parsed.data.apiKey?.trim() || undefined,
    senderEmail: parsed.data.senderEmail,
    senderName: parsed.data.senderName,
    replyTo: parsed.data.replyTo || null,
  });

  await logAudit({
    userId: ctx.userId,
    action: "platform.email.config.update",
    meta: { hasKey: Boolean(parsed.data.apiKey) },
  });

  revalidatePath("/admin/email");
  return { success: "Οι ρυθμίσεις email αποθηκεύτηκαν." };
}

export async function clearEmailApiKeyAction() {
  const ctx = await requireAdmin("super_admin");
  await clearEmailConfigApiKey();
  await logAudit({
    userId: ctx.userId,
    action: "platform.email.config.clear_api_key",
  });
  revalidatePath("/admin/email");
}

const testSchema = z.object({
  to: z.string().email(),
});

export async function sendTestEmailAction(
  _prev: EmailSettingsState,
  formData: FormData,
): Promise<EmailSettingsState> {
  const ctx = await requireAdmin("super_admin");
  const parsed = testSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return { error: "Δώσε έγκυρη διεύθυνση email." };

  const { subject, html, text } = testEmailTemplate({
    toEmail: parsed.data.to,
  });

  const res = await sendEmail({
    to: { email: parsed.data.to },
    subject,
    html,
    text,
    tags: ["admin-test"],
  });

  await logAudit({
    userId: ctx.userId,
    action: "platform.email.test",
    meta: { to: parsed.data.to, ok: res.ok },
  });

  if (!res.ok) return { error: res.error };

  if (!res.dryRun) await markEmailConfigVerified();
  revalidatePath("/admin/email");
  return {
    success: res.dryRun
      ? "Το email δεν στάλθηκε (δεν έχει ρυθμιστεί API key). Έγινε καταγραφή στο server log."
      : `Το δοκιμαστικό email εστάλη επιτυχώς προς ${parsed.data.to}.`,
  };
}
