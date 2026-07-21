"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { encryptSecret } from "@/lib/crypto";
import { formatZodError } from "@/lib/zod-el";

const schema = z.object({
  aadeUsername: z.string().min(1).max(120),
  aadePassword: z.string().min(1).max(200),
});

export type AadeState = { error?: string; success?: string } | undefined;

export async function saveAadeCredentialsAction(
  _prev: AadeState,
  formData: FormData,
): Promise<AadeState> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "business:update");

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  await prisma.business.update({
    where: { id: ctx.businessId },
    data: {
      aadeUsername: parsed.data.aadeUsername.trim(),
      aadePasswordEnc: encryptSecret(parsed.data.aadePassword),
      aadeVerifiedAt: new Date(),
    },
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "aade.credentials.update",
    meta: { hasPassword: true },
  });

  revalidatePath("/app/settings/aade");
  return { success: "Τα διαπιστευτήρια αποθηκεύτηκαν με ασφάλεια." };
}

export async function clearAadeCredentialsAction() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "business:update");

  await prisma.business.update({
    where: { id: ctx.businessId },
    data: {
      aadeUsername: null,
      aadePasswordEnc: null,
      aadeVerifiedAt: null,
    },
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "aade.credentials.clear",
  });

  revalidatePath("/app/settings/aade");
}
