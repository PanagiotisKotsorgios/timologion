"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { saveWrappSettings } from "@/lib/wrapp/settings";
import { logAudit } from "@/lib/audit";
import { formatZodError } from "@/lib/zod-el";

const schema = z.object({
  baseUrl: z
    .string()
    .url("Το URL πρέπει να είναι έγκυρο, π.χ. https://staging.wrapp.ai/api/v1"),
  partnerApiKey: z.string().optional().or(z.literal("")),
  stagingTenantApiKey: z.string().optional().or(z.literal("")),
  stagingTenantEmail: z
    .string()
    .email("Δώσε έγκυρο email.")
    .optional()
    .or(z.literal("")),
  webhookSecret: z.string().optional().or(z.literal("")),
});

export type WrappSettingsState =
  | { error?: string; success?: string }
  | undefined;

export async function saveWrappSettingsAction(
  _prev: WrappSettingsState,
  formData: FormData,
): Promise<WrappSettingsState> {
  const ctx = await requireAdmin("super_admin");

  const parsed = schema.safeParse({
    baseUrl: String(formData.get("baseUrl") ?? "").trim(),
    partnerApiKey: String(formData.get("partnerApiKey") ?? "").trim(),
    stagingTenantApiKey: String(
      formData.get("stagingTenantApiKey") ?? "",
    ).trim(),
    stagingTenantEmail: String(formData.get("stagingTenantEmail") ?? "").trim(),
    webhookSecret: String(formData.get("webhookSecret") ?? "").trim(),
  });
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  await saveWrappSettings({
    baseUrl: parsed.data.baseUrl,
    partnerApiKey: parsed.data.partnerApiKey || undefined,
    stagingTenantApiKey: parsed.data.stagingTenantApiKey || undefined,
    stagingTenantEmail: parsed.data.stagingTenantEmail,
    webhookSecret: parsed.data.webhookSecret || undefined,
  });

  await logAudit({
    userId: ctx.userId,
    action: "admin.wrapp.settings.save",
    meta: {
      baseUrl: parsed.data.baseUrl,
      updatedPartner: Boolean(parsed.data.partnerApiKey),
      updatedStagingKey: Boolean(parsed.data.stagingTenantApiKey),
      updatedWebhookSecret: Boolean(parsed.data.webhookSecret),
    },
  });

  revalidatePath("/admin/wrapp");
  return { success: "Οι ρυθμίσεις Wrapp αποθηκεύτηκαν." };
}

async function clearField(field: "partner" | "staging" | "webhook") {
  const ctx = await requireAdmin("super_admin");
  await saveWrappSettings({
    baseUrl: "",
    clearPartnerApiKey: field === "partner",
    clearStagingTenantApiKey: field === "staging",
    clearWebhookSecret: field === "webhook",
  });
  await logAudit({
    userId: ctx.userId,
    action: `admin.wrapp.clear.${field}`,
  });
  revalidatePath("/admin/wrapp");
}

export async function clearPartnerKeyAction() {
  await clearField("partner");
}
export async function clearStagingTenantKeyAction() {
  await clearField("staging");
}
export async function clearWebhookSecretAction() {
  await clearField("webhook");
}
