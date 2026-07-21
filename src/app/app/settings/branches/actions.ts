"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { formatZodError } from "@/lib/zod-el";

const schema = z.object({
  id: z.string().optional().or(z.literal("")),
  label: z.string().min(1).max(120),
  addressLine: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  isDefault: z.string().optional(),
});

export type BranchFormState = { error?: string; success?: string } | undefined;

const o = (v: string | undefined) => (v && v.length > 0 ? v : null);

export async function saveBranchAction(
  _prev: BranchFormState,
  formData: FormData,
): Promise<BranchFormState> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "business:update");

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  const data = {
    businessId: ctx.businessId,
    label: parsed.data.label,
    addressLine: o(parsed.data.addressLine),
    city: o(parsed.data.city),
    postalCode: o(parsed.data.postalCode),
    phone: o(parsed.data.phone),
    isDefault: parsed.data.isDefault === "on",
  };

  await prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.branch.updateMany({
        where: { businessId: ctx.businessId, isDefault: true },
        data: { isDefault: false },
      });
    }
    if (parsed.data.id) {
      await tx.branch.updateMany({
        where: { id: parsed.data.id, businessId: ctx.businessId },
        data,
      });
    } else {
      await tx.branch.create({ data });
    }
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: parsed.data.id ? "branch.update" : "branch.create",
    entityType: "Branch",
    entityId: parsed.data.id || undefined,
  });

  revalidatePath("/app/settings/branches");
  return { success: parsed.data.id ? "Ενημερώθηκε." : "Δημιουργήθηκε." };
}

export async function deleteBranchAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "business:update");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.branch.deleteMany({
    where: { id, businessId: ctx.businessId },
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "branch.delete",
    entityType: "Branch",
    entityId: id,
  });

  revalidatePath("/app/settings/branches");
}
