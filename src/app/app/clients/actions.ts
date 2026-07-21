"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { getWrappClient } from "@/lib/wrapp/client";
import { lookupVatViaBusiness } from "@/lib/aade/client";
import { formatZodError } from "@/lib/zod-el";

const clientSchema = z.object({
  vatNumber: z.string().max(20).optional().or(z.literal("")),
  legalName: z.string().min(2).max(160),
  tradeName: z.string().max(160).optional().or(z.literal("")),
  taxOffice: z.string().max(120).optional().or(z.literal("")),
  activity: z.string().max(200).optional().or(z.literal("")),
  addressLine: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
});

export type ClientFormState = { error?: string } | undefined;

function o(v: string | undefined): string | null {
  return v && v.length > 0 ? v : null;
}

export async function createClientAction(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:write");

  const parsed = clientSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  const client = await prisma.client.create({
    data: {
      businessId: ctx.businessId,
      vatNumber: o(parsed.data.vatNumber),
      legalName: parsed.data.legalName,
      tradeName: o(parsed.data.tradeName),
      taxOffice: o(parsed.data.taxOffice),
      activity: o(parsed.data.activity),
      addressLine: o(parsed.data.addressLine),
      city: o(parsed.data.city),
      postalCode: o(parsed.data.postalCode),
      email: o(parsed.data.email),
      phone: o(parsed.data.phone),
      notes: o(parsed.data.notes),
    },
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "client.create",
    entityType: "Client",
    entityId: client.id,
  });

  revalidatePath("/app/clients");
  redirect(`/app/clients/${client.id}`);
}

export async function updateClientAction(
  clientId: string,
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:write");

  const parsed = clientSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  const client = await prisma.client.updateMany({
    where: { id: clientId, businessId: ctx.businessId },
    data: {
      vatNumber: o(parsed.data.vatNumber),
      legalName: parsed.data.legalName,
      tradeName: o(parsed.data.tradeName),
      taxOffice: o(parsed.data.taxOffice),
      activity: o(parsed.data.activity),
      addressLine: o(parsed.data.addressLine),
      city: o(parsed.data.city),
      postalCode: o(parsed.data.postalCode),
      email: o(parsed.data.email),
      phone: o(parsed.data.phone),
      notes: o(parsed.data.notes),
    },
  });

  if (client.count === 0) {
    return { error: "Ο πελάτης δεν βρέθηκε." };
  }

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "client.update",
    entityType: "Client",
    entityId: clientId,
  });

  revalidatePath(`/app/clients/${clientId}`);
  revalidatePath("/app/clients");
  redirect(`/app/clients/${clientId}`);
}

const vatSearchSchema = z.object({ vat: z.string().min(3).max(20) });

export async function vatSearchAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:write");

  const parsed = vatSearchSchema.safeParse({ vat: formData.get("vat") });
  if (!parsed.success) return { ok: false as const, error: "Μη έγκυρο ΑΦΜ." };

  // Prefer AADE / ΓΓΠΣ when the business has stored credentials; fall back to
  // the provider stub. Both shapes match the WrappVatSearchResult type.
  const aadeResult = await lookupVatViaBusiness(
    ctx.businessId,
    parsed.data.vat,
  );
  if (aadeResult) {
    return {
      ok: true as const,
      result: {
        vat: aadeResult.vat,
        legal_name: aadeResult.legal_name,
        trade_name: aadeResult.trade_name ?? null,
        address: aadeResult.address ?? null,
        city: aadeResult.city ?? null,
        postal_code: aadeResult.postal_code ?? null,
        activity: aadeResult.activity ?? null,
        tax_office: aadeResult.tax_office ?? null,
        country_code: "EL",
      },
      source: aadeResult.source,
    };
  }

  const result = await getWrappClient().vatSearch(parsed.data.vat);
  if (!result) return { ok: false as const, error: "Το ΑΦΜ δεν βρέθηκε." };
  return { ok: true as const, result, source: "provider" as const };
}
