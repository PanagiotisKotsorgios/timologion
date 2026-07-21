"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { formatZodError } from "@/lib/zod-el";
import { parseCsv } from "@/lib/csv";

const itemSchema = z.object({
  kind: z.enum(["service", "product"]).default("service"),
  code: z.string().max(60).optional().or(z.literal("")),
  name: z.string().min(1).max(160),
  description: z.string().max(5000).optional().or(z.literal("")),
  unit: z.string().max(20).default("τμχ"),
  defaultPrice: z.coerce.number().min(0).max(999999999),
  vatRate: z.coerce.number().min(0).max(100).default(24),
  vatCategory: z.string().max(20).optional().or(z.literal("")),
  stockOnHand: z.coerce.number().optional(),
  stockAlertAt: z.coerce.number().optional(),
});

export type ItemFormState = { error?: string } | undefined;

function o(v: string | undefined): string | null {
  return v && v.length > 0 ? v : null;
}

export async function createItemAction(
  _prev: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "item:write");

  const parsed = itemSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  const item = await prisma.item.create({
    data: {
      businessId: ctx.businessId,
      kind: parsed.data.kind,
      code: o(parsed.data.code),
      name: parsed.data.name,
      description: o(parsed.data.description),
      unit: parsed.data.unit || "τμχ",
      defaultPrice: parsed.data.defaultPrice,
      vatRate: parsed.data.vatRate,
      vatCategory: o(parsed.data.vatCategory),
      stockOnHand:
        parsed.data.stockOnHand !== undefined && !Number.isNaN(parsed.data.stockOnHand)
          ? parsed.data.stockOnHand
          : null,
      stockAlertAt:
        parsed.data.stockAlertAt !== undefined && !Number.isNaN(parsed.data.stockAlertAt)
          ? parsed.data.stockAlertAt
          : null,
    },
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "item.create",
    entityType: "Item",
    entityId: item.id,
  });

  revalidatePath("/app/items");
  redirect(`/app/items/${item.id}`);
}

export async function updateItemAction(
  itemId: string,
  _prev: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "item:write");

  const parsed = itemSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) };
  }

  const res = await prisma.item.updateMany({
    where: { id: itemId, businessId: ctx.businessId },
    data: {
      kind: parsed.data.kind,
      code: o(parsed.data.code),
      name: parsed.data.name,
      description: o(parsed.data.description),
      unit: parsed.data.unit || "τμχ",
      defaultPrice: parsed.data.defaultPrice,
      vatRate: parsed.data.vatRate,
      vatCategory: o(parsed.data.vatCategory),
      stockOnHand:
        parsed.data.stockOnHand !== undefined && !Number.isNaN(parsed.data.stockOnHand)
          ? parsed.data.stockOnHand
          : null,
      stockAlertAt:
        parsed.data.stockAlertAt !== undefined && !Number.isNaN(parsed.data.stockAlertAt)
          ? parsed.data.stockAlertAt
          : null,
    },
  });

  if (res.count === 0) return { error: "Το είδος δεν βρέθηκε." };

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "item.update",
    entityType: "Item",
    entityId: itemId,
  });

  revalidatePath("/app/items");
  revalidatePath(`/app/items/${itemId}`);
  redirect(`/app/items/${itemId}`);
}

// ─── Bulk CSV import ──────────────────────────────────────────────────────

const HEADER_ALIASES: Record<string, string> = {
  code: "code",
  κωδικος: "code",
  κωδικός: "code",
  name: "name",
  ονομασια: "name",
  ονομασία: "name",
  περιγραφη: "name",
  περιγραφή: "name",
  description: "description",
  σχολια: "description",
  σχόλια: "description",
  unit: "unit",
  μοναδα: "unit",
  μονάδα: "unit",
  price: "defaultPrice",
  τιμη: "defaultPrice",
  τιμή: "defaultPrice",
  defaultprice: "defaultPrice",
  vat: "vatRate",
  vatrate: "vatRate",
  φπα: "vatRate",
  kind: "kind",
  τυπος: "kind",
  τύπος: "kind",
};

function parseKind(v: string): "service" | "product" {
  const norm = v.trim().toLowerCase();
  if (norm.startsWith("prod") || norm.startsWith("προϊ") || norm.startsWith("προι"))
    return "product";
  return "service";
}

function parseDecimal(v: string): number {
  const cleaned = v.trim().replace(/[€\s]/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export type ImportItemsResult = {
  ok: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

export async function importItemsCsvAction(
  formData: FormData,
): Promise<ImportItemsResult> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "item:write");

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, created: 0, updated: 0, skipped: 0, errors: [{ row: 0, message: "Δεν επιλέχθηκε αρχείο." }] };
  }
  if (file.size > 4 * 1024 * 1024) {
    return { ok: false, created: 0, updated: 0, skipped: 0, errors: [{ row: 0, message: "Το αρχείο υπερβαίνει τα 4MB." }] };
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { ok: false, created: 0, updated: 0, skipped: 0, errors: [{ row: 0, message: "Το CSV είναι κενό ή δεν έχει επικεφαλίδα." }] };
  }

  const header = (rows[0] ?? []).map((h) =>
    (HEADER_ALIASES[h.trim().toLowerCase()] ?? h.trim().toLowerCase()) as string,
  );
  const nameIdx = header.indexOf("name");
  if (nameIdx < 0) {
    return { ok: false, created: 0, updated: 0, skipped: 0, errors: [{ row: 1, message: "Λείπει η στήλη 'name' (ή 'Ονομασία')." }] };
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

    const name = get("name");
    if (!name) {
      skipped++;
      continue;
    }

    const data = {
      businessId: ctx.businessId,
      kind: parseKind(get("kind") || "service"),
      code: get("code") || null,
      name: name.slice(0, 160),
      description: get("description") || null,
      unit: get("unit") || "τμχ",
      defaultPrice: parseDecimal(get("defaultPrice")),
      vatRate: parseDecimal(get("vatRate") || "24"),
    };

    try {
      if (data.code) {
        const existing = await prisma.item.findFirst({
          where: { businessId: ctx.businessId, code: data.code },
          select: { id: true },
        });
        if (existing) {
          await prisma.item.update({ where: { id: existing.id }, data });
          updated++;
          continue;
        }
      }
      await prisma.item.create({ data });
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
    action: "item.import",
    entityType: "Item",
    meta: { created, updated, skipped, errors: errors.length },
  });

  revalidatePath("/app/items");
  return { ok: errors.length === 0, created, updated, skipped, errors };
}

// ─── Stock movements ──────────────────────────────────────────────────────

const stockMoveSchema = z.object({
  itemId: z.string().min(1),
  kind: z.enum(["in", "out", "adjustment"]),
  quantity: z.coerce.number().gt(0),
  reason: z.string().max(200).optional().or(z.literal("")),
});

export async function recordStockMovementAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "item:write");
  const parsed = stockMoveSchema.safeParse({
    itemId: formData.get("itemId"),
    kind: formData.get("kind"),
    quantity: formData.get("quantity"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

  const item = await prisma.item.findFirst({
    where: { id: parsed.data.itemId, businessId: ctx.businessId },
    select: { id: true, stockOnHand: true },
  });
  if (!item) return { ok: false, error: "Το είδος δεν βρέθηκε." };

  const current = item.stockOnHand ? Number(item.stockOnHand.toString()) : 0;
  const delta =
    parsed.data.kind === "in"
      ? parsed.data.quantity
      : parsed.data.kind === "out"
        ? -parsed.data.quantity
        : parsed.data.quantity - current;
  const next = current + delta;

  await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        businessId: ctx.businessId,
        itemId: item.id,
        kind: parsed.data.kind,
        quantity: Math.abs(delta),
        reason: parsed.data.reason || null,
      },
    }),
    prisma.item.update({
      where: { id: item.id },
      data: { stockOnHand: next },
    }),
  ]);

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "stock.movement",
    entityType: "Item",
    entityId: item.id,
    meta: { kind: parsed.data.kind, delta, next },
  });

  revalidatePath(`/app/items/${item.id}`);
  return { ok: true };
}

// ─── Price tiers ─────────────────────────────────────────────────────────

const tierSchema = z.object({
  itemId: z.string().min(1),
  tier: z.string().min(1).max(40),
  price: z.coerce.number().min(0),
});

export async function saveItemPriceTierAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "item:write");
  const parsed = tierSchema.safeParse({
    itemId: formData.get("itemId"),
    tier: formData.get("tier"),
    price: formData.get("price"),
  });
  if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

  const item = await prisma.item.findFirst({
    where: { id: parsed.data.itemId, businessId: ctx.businessId },
    select: { id: true },
  });
  if (!item) return { ok: false, error: "Το είδος δεν βρέθηκε." };

  await prisma.itemPrice.upsert({
    where: {
      itemId_tier: { itemId: item.id, tier: parsed.data.tier },
    },
    create: {
      itemId: item.id,
      tier: parsed.data.tier,
      price: parsed.data.price,
    },
    update: { price: parsed.data.price },
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "item.price.save",
    entityType: "Item",
    entityId: item.id,
    meta: { tier: parsed.data.tier, price: parsed.data.price },
  });

  revalidatePath(`/app/items/${item.id}`);
  return { ok: true };
}

export async function deleteItemPriceTierAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "item:write");
  const itemId = String(formData.get("itemId") ?? "");
  const tier = String(formData.get("tier") ?? "");
  const item = await prisma.item.findFirst({
    where: { id: itemId, businessId: ctx.businessId },
    select: { id: true },
  });
  if (!item) return;

  await prisma.itemPrice.deleteMany({ where: { itemId: item.id, tier } });
  revalidatePath(`/app/items/${item.id}`);
}
