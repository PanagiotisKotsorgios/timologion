"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession, setActiveBusiness } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { formatZodError } from "@/lib/zod-el";

const onboardingSchema = z.object({
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

export type OnboardingState = { error?: string } | undefined;

function optional(v: string | undefined): string | null {
  return v && v.length > 0 ? v : null;
}

export async function createBusinessAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = onboardingSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );

  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  const data = parsed.data;

  const business = await prisma.$transaction(async (tx) => {
    const b = await tx.business.create({
      data: {
        vatNumber: data.vatNumber.replace(/\s+/g, ""),
        legalName: data.legalName,
        tradeName: optional(data.tradeName),
        taxOffice: optional(data.taxOffice),
        activity: optional(data.activity),
        addressLine: optional(data.addressLine),
        city: optional(data.city),
        postalCode: optional(data.postalCode),
        phone: optional(data.phone),
        email: optional(data.email),
      },
    });

    await tx.businessMember.create({
      data: {
        userId: session.userId,
        businessId: b.id,
        role: "owner",
      },
    });

    await tx.wrappConnection.create({
      data: { businessId: b.id, status: "inactive" },
    });

    return b;
  });

  await setActiveBusiness(session.sessionId, business.id);
  await logAudit({
    userId: session.userId,
    businessId: business.id,
    action: "business.create",
    entityType: "Business",
    entityId: business.id,
  });

  redirect("/app");
}
