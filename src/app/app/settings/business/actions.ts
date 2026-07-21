"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { formatZodError } from "@/lib/zod-el";

const schema = z.object({
  vatNumber: z.string().min(5).max(20),
  legalName: z.string().min(2).max(160),
  tradeName: z.string().max(160).optional().or(z.literal("")),
  taxOffice: z.string().max(120).optional().or(z.literal("")),
  activity: z.string().max(200).optional().or(z.literal("")),
  addressLine: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
});

export type BusinessSettingsState =
  | { error?: string; success?: string }
  | undefined;

const o = (v: string | undefined) => (v && v.length > 0 ? v : null);

export async function updateBusinessAction(
  _prev: BusinessSettingsState,
  formData: FormData,
): Promise<BusinessSettingsState> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "business:update");

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  await prisma.business.update({
    where: { id: ctx.businessId },
    data: {
      vatNumber: parsed.data.vatNumber.replace(/\s+/g, ""),
      legalName: parsed.data.legalName,
      tradeName: o(parsed.data.tradeName),
      taxOffice: o(parsed.data.taxOffice),
      activity: o(parsed.data.activity),
      addressLine: o(parsed.data.addressLine),
      city: o(parsed.data.city),
      postalCode: o(parsed.data.postalCode),
      phone: o(parsed.data.phone),
      email: o(parsed.data.email),
    },
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "business.update",
    entityType: "Business",
    entityId: ctx.businessId,
  });

  revalidatePath("/app/settings/business");
  return { success: "Τα στοιχεία αποθηκεύτηκαν." };
}
