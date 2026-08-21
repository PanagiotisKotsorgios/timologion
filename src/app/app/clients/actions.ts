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
import { parseCsv } from "@/lib/csv";

const clientSchema = z.object({
  vatNumber: z.string().max(20).optional().or(z.literal("")),
  legalName: z.string().min(2).max(160),
  tradeName: z.string().max(160).optional().or(z.literal("")),
  taxOffice: z.string().max(120).optional().or(z.literal("")),
  activity: z.string().max(200).optional().or(z.literal("")),
  addressLine: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  // ISO-3166 alpha-2 code (GR, DE, IT, US...). Stored as VARCHAR(2)
  // in the DB with default "GR". Empty string collapses to "GR" in
  // the update mapping so we never persist an invalid short code.
  country: z.string().max(2).optional().or(z.literal("")),
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
      country: (parsed.data.country || "GR").toUpperCase(),
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

/**
 * Lightweight client-add used from quick-add modals (e.g. inside the
 * document editor). Same validation as createClientAction but returns
 * the created row instead of redirecting, so the caller can drop it
 * into its own state and select it inline.
 */
export async function quickCreateClientAction(formData: FormData): Promise<
  | { ok: true; id: string; label: string; vatNumber: string | null }
  | { ok: false; error: string }
> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:write");

  const parsed = clientSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { ok: false, error: formatZodError(parsed.error) };
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
      country: (parsed.data.country || "GR").toUpperCase(),
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
    meta: { via: "quick-add" },
  });

  revalidatePath("/app/clients");
  return {
    ok: true,
    id: client.id,
    label: client.tradeName ?? client.legalName,
    vatNumber: client.vatNumber,
  };
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
      country: (parsed.data.country || "GR").toUpperCase(),
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
  // Public-registry lookup, no tenant data touched — no need to gate on
  // client:write. Any authenticated tenant user can look up an ΑΦΜ,
  // including expense-only users filling out a Νέος προμηθευτής form.
  const ctx = await requireTenant();

  const parsed = vatSearchSchema.safeParse({ vat: formData.get("vat") });
  if (!parsed.success) return { ok: false as const, error: "Μη έγκυρο ΑΦΜ." };

  // ΑΑΔΕ lookup is the rich data source (ΔΟΥ, δραστηριότητα, address, ...).
  // If the business hasn't stored ΓΓΠΣ credentials yet, we can still try
  // the provider's `vat_search` (name + address only), but we surface a
  // distinct "needs setup" hint so the user knows why fields come back
  // sparse. In production we don't fabricate mock data.
  const business = await prisma.business.findUnique({
    where: { id: ctx.businessId },
    select: { aadeUsername: true, aadePasswordEnc: true },
  });
  const hasAadeCreds = Boolean(
    business?.aadeUsername && business?.aadePasswordEnc,
  );

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
        phone: null,
        email: null,
        country_code: "EL",
      },
      source: aadeResult.source,
    };
  }

  try {
    const result = await getWrappClient().vatSearch(
      ctx.businessId,
      parsed.data.vat,
    );
    if (!result) {
      return {
        ok: false as const,
        error:
          "Το ΑΦΜ δεν βρέθηκε στο μητρώο. Έλεγξε ότι είναι σωστό και δοκίμασε ξανά.",
      };
    }
    return {
      ok: true as const,
      result,
      source: "provider" as const,
      hasAadeCreds,
    };
  } catch {
    return {
      ok: false as const,
      error:
        "Αδυναμία επικοινωνίας με τον πάροχο για αναζήτηση ΑΦΜ. Δοκίμασε ξανά σε λίγο.",
    };
  }
}

// ─── CSV import ─────────────────────────────────────────────────────────

const CLIENT_HEADER_ALIASES: Record<string, string> = {
  legalname: "legalName",
  "legal name": "legalName",
  επωνυμια: "legalName",
  επωνυμία: "legalName",
  "νομικη επωνυμια": "legalName",
  "νόμιμη επωνυμία": "legalName",
  ονομα: "legalName",
  όνομα: "legalName",
  tradename: "tradeName",
  "trade name": "tradeName",
  "διακριτικος τιτλος": "tradeName",
  "διακριτικός τίτλος": "tradeName",
  vat: "vatNumber",
  vatnumber: "vatNumber",
  αφμ: "vatNumber",
  taxoffice: "taxOffice",
  "tax office": "taxOffice",
  δου: "taxOffice",
  δού: "taxOffice",
  δοη: "taxOffice",
  δοή: "taxOffice",
  address: "addressLine",
  addressline: "addressLine",
  "address line": "addressLine",
  διευθυνση: "addressLine",
  διεύθυνση: "addressLine",
  city: "city",
  πολη: "city",
  πόλη: "city",
  postal: "postalCode",
  postalcode: "postalCode",
  "postal code": "postalCode",
  τκ: "postalCode",
  "τ.κ.": "postalCode",
  country: "country",
  χωρα: "country",
  χώρα: "country",
  email: "email",
  phone: "phone",
  τηλεφωνο: "phone",
  τηλέφωνο: "phone",
  activity: "activity",
  δραστηριοτητα: "activity",
  δραστηριότητα: "activity",
  notes: "notes",
  σημειωσεις: "notes",
  σημειώσεις: "notes",
};

export type ImportClientsResult = {
  ok: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

/**
 * Bulk-import clients from a CSV. Matches existing rows by VAT number
 * (when present) — updates in place instead of creating duplicates.
 * Rows without a legalName are skipped.
 *
 * The header row is case-insensitive; both English keys ("legalName",
 * "vatNumber") and Greek labels ("Επωνυμία", "ΑΦΜ") are accepted.
 */
export async function importClientsCsvAction(
  formData: FormData,
): Promise<ImportClientsResult> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:write");

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return {
      ok: false,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [{ row: 0, message: "Δεν επιλέχθηκε αρχείο." }],
    };
  }
  if (file.size > 4 * 1024 * 1024) {
    return {
      ok: false,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [{ row: 0, message: "Το αρχείο υπερβαίνει τα 4MB." }],
    };
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return {
      ok: false,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [{ row: 0, message: "Το CSV είναι κενό ή δεν έχει επικεφαλίδα." }],
    };
  }

  const header = (rows[0] ?? []).map(
    (h) => CLIENT_HEADER_ALIASES[h.trim().toLowerCase()] ?? h.trim(),
  );
  const legalNameIdx = header.indexOf("legalName");
  if (legalNameIdx < 0) {
    return {
      ok: false,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [
        {
          row: 1,
          message: "Λείπει η στήλη 'legalName' (ή «Επωνυμία» / «Νόμιμη επωνυμία»).",
        },
      ],
    };
  }

  const errors: { row: number; message: string }[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const get = (key: string): string => {
      const idx = header.indexOf(key);
      return idx >= 0 ? (row[idx] ?? "").trim() : "";
    };

    const legalName = get("legalName");
    if (!legalName) {
      skipped++;
      continue;
    }

    const vat = get("vatNumber").replace(/\D/g, "") || null;
    const data = {
      businessId: ctx.businessId,
      legalName: legalName.slice(0, 160),
      tradeName: get("tradeName").slice(0, 160) || null,
      vatNumber: vat,
      taxOffice: get("taxOffice").slice(0, 120) || null,
      activity: get("activity").slice(0, 200) || null,
      addressLine: get("addressLine").slice(0, 200) || null,
      city: get("city").slice(0, 80) || null,
      postalCode: get("postalCode").slice(0, 20) || null,
      country: get("country").slice(0, 2) || "GR",
      email: get("email").slice(0, 160) || null,
      phone: get("phone").slice(0, 30) || null,
      notes: get("notes").slice(0, 5000) || null,
    };

    try {
      if (vat) {
        const existing = await prisma.client.findFirst({
          where: { businessId: ctx.businessId, vatNumber: vat },
          select: { id: true },
        });
        if (existing) {
          await prisma.client.update({ where: { id: existing.id }, data });
          updated++;
          continue;
        }
      }
      await prisma.client.create({ data });
      created++;
    } catch (err) {
      errors.push({
        row: i + 1,
        message: err instanceof Error ? err.message : "Άγνωστο σφάλμα.",
      });
    }
  }

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "client.import",
    entityType: "Client",
    meta: { created, updated, skipped, errors: errors.length },
  });

  revalidatePath("/app/clients");
  return { ok: errors.length === 0, created, updated, skipped, errors };
}
