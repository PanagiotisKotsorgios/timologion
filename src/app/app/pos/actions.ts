"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { formatZodError } from "@/lib/zod-el";
import { computeDocument, computeLine } from "@/lib/totals";

const tableSchema = z.object({
  label: z.string().min(1).max(60),
  seats: z.coerce.number().int().min(1).max(30).default(2),
});

export async function createPosTableAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");
  const parsed = tableSchema.safeParse({
    label: formData.get("label"),
    seats: formData.get("seats") || 2,
  });
  if (!parsed.success) return { ok: false as const, error: formatZodError(parsed.error) };

  await prisma.posTable.create({
    data: {
      businessId: ctx.businessId,
      label: parsed.data.label,
      seats: parsed.data.seats,
    },
  });
  revalidatePath("/app/pos");
  return { ok: true as const };
}

export async function deletePosTableAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");
  const id = String(formData.get("id") ?? "");
  await prisma.posTable.deleteMany({
    where: { id, businessId: ctx.businessId },
  });
  revalidatePath("/app/pos");
}

const openTabSchema = z.object({
  tableId: z.string().optional().or(z.literal("")),
  label: z.string().max(80).optional().or(z.literal("")),
});

export async function openTabAction(
  formData: FormData,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");
  const parsed = openTabSchema.safeParse({
    tableId: formData.get("tableId") || "",
    label: formData.get("label") || "",
  });
  if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

  const tab = await prisma.posTab.create({
    data: {
      businessId: ctx.businessId,
      tableId: parsed.data.tableId || null,
      label: parsed.data.label || null,
    },
    select: { id: true },
  });

  revalidatePath("/app/pos");
  return { ok: true, id: tab.id };
}

const addItemSchema = z.object({
  tabId: z.string().min(1),
  itemId: z.string().optional().or(z.literal("")),
  name: z.string().min(1).max(160),
  quantity: z.coerce.number().gt(0),
  unitPrice: z.coerce.number().min(0),
  vatRate: z.coerce.number().min(0).max(100).default(24),
});

async function refreshTabTotals(tabId: string) {
  const items = await prisma.posTabItem.findMany({ where: { tabId } });
  const totals = computeDocument(
    items.map((i) => ({
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      vatRate: i.vatRate,
    })),
  );
  await prisma.posTab.update({
    where: { id: tabId },
    data: {
      netTotal: totals.netTotal,
      vatTotal: totals.vatTotal,
      total: totals.total,
    },
  });
}

export async function addTabItemAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");
  const parsed = addItemSchema.safeParse({
    tabId: formData.get("tabId"),
    itemId: formData.get("itemId") || "",
    name: formData.get("name"),
    quantity: formData.get("quantity") || 1,
    unitPrice: formData.get("unitPrice") || 0,
    vatRate: formData.get("vatRate") || 24,
  });
  if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

  const tab = await prisma.posTab.findFirst({
    where: {
      id: parsed.data.tabId,
      businessId: ctx.businessId,
      status: "open",
    },
    select: { id: true },
  });
  if (!tab) return { ok: false, error: "Ο λογαριασμός δεν βρέθηκε ή είναι κλειστός." };

  await prisma.posTabItem.create({
    data: {
      tabId: tab.id,
      itemId: parsed.data.itemId || null,
      name: parsed.data.name,
      quantity: parsed.data.quantity,
      unitPrice: parsed.data.unitPrice,
      vatRate: parsed.data.vatRate,
    },
  });
  await refreshTabTotals(tab.id);
  revalidatePath(`/app/pos/${tab.id}`);
  return { ok: true };
}

export async function removeTabItemAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");
  const id = String(formData.get("id") ?? "");
  const item = await prisma.posTabItem.findUnique({
    where: { id },
    select: { tabId: true, tab: { select: { businessId: true } } },
  });
  if (!item || item.tab.businessId !== ctx.businessId) return;
  await prisma.posTabItem.delete({ where: { id } });
  await refreshTabTotals(item.tabId);
  revalidatePath(`/app/pos/${item.tabId}`);
}

const closeTabSchema = z.object({
  tabId: z.string().min(1),
  paymentMethod: z.enum(["cash", "card", "bank_transfer", "iris", "other"]),
  issueReceipt: z.string().optional(),
});

export async function closeTabAction(
  formData: FormData,
): Promise<{ ok: true; documentId?: string } | { ok: false; error: string }> {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");
  const parsed = closeTabSchema.safeParse({
    tabId: formData.get("tabId"),
    paymentMethod: formData.get("paymentMethod"),
    issueReceipt: formData.get("issueReceipt") ?? "",
  });
  if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

  const tab = await prisma.posTab.findFirst({
    where: {
      id: parsed.data.tabId,
      businessId: ctx.businessId,
      status: "open",
    },
    include: { items: true },
  });
  if (!tab) return { ok: false, error: "Ο λογαριασμός δεν βρέθηκε." };
  if (tab.items.length === 0)
    return { ok: false, error: "Δεν υπάρχουν είδη στον λογαριασμό." };

  let documentId: string | undefined;

  await prisma.$transaction(async (tx) => {
    let docId: string | null = null;

    if (parsed.data.issueReceipt === "1") {
      const totals = computeDocument(tab.items);
      const doc = await tx.document.create({
        data: {
          businessId: ctx.businessId,
          type: "retail_receipt",
          status: "draft",
          issueDate: new Date(),
          paymentMethod: parsed.data.paymentMethod,
          netTotalAmount: totals.netTotal,
          vatTotalAmount: totals.vatTotal,
          totalAmount: totals.total,
          payableTotalAmount: totals.total,
          notes: `POS λογαριασμός${tab.label ? " · " + tab.label : ""}`,
        },
      });
      docId = doc.id;
      await tx.documentLine.createMany({
        data: tab.items.map((item, i) => {
          const t = computeLine(item);
          return {
            documentId: doc.id,
            itemId: item.itemId,
            ordinal: i,
            description: item.name,
            quantity: item.quantity,
            unit: "τμχ",
            unitPrice: item.unitPrice,
            discountPct: 0,
            vatRate: item.vatRate,
            netAmount: t.net,
            vatAmount: t.vat,
            totalAmount: t.total,
          };
        }),
      });
    }

    await tx.payment.create({
      data: {
        businessId: ctx.businessId,
        documentId: docId,
        amount: tab.total,
        method: parsed.data.paymentMethod,
        reference: `POS/${tab.id.slice(0, 6)}`,
      },
    });

    await tx.posTab.update({
      where: { id: tab.id },
      data: {
        status: "closed",
        closedAt: new Date(),
        paymentMethod: parsed.data.paymentMethod,
        documentId: docId,
      },
    });

    documentId = docId ?? undefined;
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "pos.close_tab",
    entityType: "PosTab",
    entityId: tab.id,
    meta: { paymentMethod: parsed.data.paymentMethod, total: tab.total.toString() },
  });

  revalidatePath("/app/pos");
  return { ok: true, documentId };
}

export async function cancelTabAction(formData: FormData) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");
  const id = String(formData.get("tabId") ?? "");
  await prisma.posTab.updateMany({
    where: { id, businessId: ctx.businessId, status: "open" },
    data: { status: "cancelled", closedAt: new Date() },
  });
  revalidatePath("/app/pos");
}
