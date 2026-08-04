"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { generateApiKey } from "@/lib/api-keys";
import { formatZodError } from "@/lib/zod-el";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  scopes: z.string().max(500).optional().or(z.literal("")),
});

export async function createApiKeyAction(
  formData: FormData,
): Promise<{ ok: true; plaintext: string } | { ok: false; error: string }> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "business:update");
  const parsed = createSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

  const { plaintext, prefix, keyHash } = generateApiKey();

  await prisma.apiKey.create({
    data: {
      businessId: ctx.businessId,
      name: parsed.data.name,
      prefix,
      keyHash,
      scopes: parsed.data.scopes || null,
      createdById: ctx.userId,
    },
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "api_key.create",
    entityType: "ApiKey",
    meta: { name: parsed.data.name, prefix },
  });

  revalidatePath("/app/settings/api-keys");
  return { ok: true, plaintext };
}

export async function revokeKeyAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "business:update");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const key = await prisma.apiKey.findFirst({
    where: { id, businessId: ctx.businessId },
  });
  if (!key) return;

  await prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "api_key.revoke",
    entityType: "ApiKey",
    entityId: id,
    meta: { name: key.name, prefix: key.prefix },
  });

  revalidatePath("/app/settings/api-keys");
}
