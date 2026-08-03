"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email/send";
import { formatZodError } from "@/lib/zod-el";

const saveSchema = z.object({
  key: z.string().min(1).max(80),
  description: z.string().max(500).optional().or(z.literal("")),
  subject: z.string().min(2).max(500),
  bodyHtml: z.string().min(10).max(50_000),
});

export async function saveTemplateAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdmin("super_admin");
  const parsed = saveSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

  await prisma.emailTemplate.upsert({
    where: { key: parsed.data.key },
    create: {
      key: parsed.data.key,
      description: parsed.data.description || null,
      subject: parsed.data.subject,
      bodyHtml: parsed.data.bodyHtml,
    },
    update: {
      description: parsed.data.description || null,
      subject: parsed.data.subject,
      bodyHtml: parsed.data.bodyHtml,
    },
  });

  await logAudit({
    userId: ctx.userId,
    action: "admin.email_template.save",
    entityType: "EmailTemplate",
    entityId: parsed.data.key,
  });

  revalidatePath("/admin/email-templates");
  return { ok: true };
}

export async function revertTemplateAction(formData: FormData) {
  const ctx = await requireAdmin("super_admin");
  const key = String(formData.get("key") ?? "");
  if (!key) return;
  await prisma.emailTemplate.delete({ where: { key } }).catch(() => undefined);
  await logAudit({
    userId: ctx.userId,
    action: "admin.email_template.revert",
    entityType: "EmailTemplate",
    entityId: key,
  });
  revalidatePath("/admin/email-templates");
}

const sendTestSchema = z.object({
  key: z.string().min(1).max(80),
  to: z.string().email(),
  subject: z.string().min(1).max(500),
  bodyHtml: z.string().min(10).max(50_000),
});

export async function sendTestTemplateAction(
  formData: FormData,
): Promise<{ ok: true; dryRun?: boolean } | { ok: false; error: string }> {
  const ctx = await requireAdmin("super_admin");
  const parsed = sendTestSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

  const res = await sendEmail({
    to: { email: parsed.data.to, name: "Test" },
    subject: `[TEST] ${parsed.data.subject}`,
    html: parsed.data.bodyHtml,
    text: parsed.data.bodyHtml.replace(/<[^>]+>/g, ""),
    tags: ["template-test", parsed.data.key],
  });

  await logAudit({
    userId: ctx.userId,
    action: "admin.email_template.test_send",
    entityType: "EmailTemplate",
    entityId: parsed.data.key,
    meta: { to: parsed.data.to, sent: res.ok, dryRun: res.ok ? res.dryRun ?? false : false },
  });

  if (!res.ok) return { ok: false, error: "Απέτυχε η αποστολή." };
  return { ok: true, dryRun: res.dryRun ?? false };
}
