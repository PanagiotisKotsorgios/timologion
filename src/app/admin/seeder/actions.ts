"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { env } from "@/lib/env";
import { formatZodError } from "@/lib/zod-el";

const schema = z.object({
  legalName: z.string().min(2).max(160),
  clientCount: z.coerce.number().int().min(0).max(50).default(5),
  itemCount: z.coerce.number().int().min(0).max(50).default(5),
  draftCount: z.coerce.number().int().min(0).max(50).default(3),
});

/**
 * Insert a demo business + related rows. All strings are prefixed with
 * "[SEED]" so they're trivially identifiable in any list. VAT is a
 * synthesized 9-digit number starting with 000 (out of the valid Greek
 * range) so nobody accidentally sends it to Wrapp.
 */
export async function runSeederAction(
  formData: FormData,
): Promise<
  | { ok: true; businessId: string; summary: string }
  | { ok: false; error: string }
> {
  const ctx = await requireAdmin("super_admin");
  const envLabel = env.ENVIRONMENT_LABEL?.trim() ?? "";
  const isProd = env.NODE_ENV === "production";
  if (isProd && !/staging|dev|local/i.test(envLabel)) {
    return { ok: false, error: "Seeder disabled σε production." };
  }

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

  const stamp = Date.now().toString().slice(-6);
  const vat = `000${stamp}`.slice(0, 9);

  const business = await prisma.business.create({
    data: {
      legalName: `[SEED] ${parsed.data.legalName}`,
      tradeName: `[SEED] ${parsed.data.legalName}`,
      vatNumber: vat,
      country: "GR",
      city: "Αθήνα",
      addressLine: "Οδός Δοκιμαστική 1",
      postalCode: "10000",
      email: `seed-${stamp}@example.local`,
      phone: `210000${stamp.slice(0, 4)}`,
      supportTags: "seed,qa",
    },
  });

  // Members: none by default. The admin can assign themselves via the
  // business detail page if they want to impersonate into it.

  const clients = await Promise.all(
    Array.from({ length: parsed.data.clientCount }).map((_, i) =>
      prisma.client.create({
        data: {
          businessId: business.id,
          legalName: `[SEED] Πελάτης ${i + 1}`,
          vatNumber: `999${String(i).padStart(6, "0")}`,
          taxOffice: "ΙΓ' Αθηνών",
          country: "GR",
          city: "Αθήνα",
        },
      }),
    ),
  );

  const items = await Promise.all(
    Array.from({ length: parsed.data.itemCount }).map((_, i) =>
      prisma.item.create({
        data: {
          businessId: business.id,
          name: `[SEED] Είδος ${i + 1}`,
          kind: i % 2 === 0 ? "product" : "service",
          defaultPrice: 10 + i * 5,
          vatRate: 24,
          unit: "τμχ",
        },
      }),
    ),
  );

  // Draft documents referencing random clients + items.
  const drafts: string[] = [];
  for (let i = 0; i < parsed.data.draftCount; i++) {
    const client = clients[i % Math.max(1, clients.length)];
    if (!client) break;
    const lineItem = items[i % Math.max(1, items.length)];
    const net = Number(lineItem?.defaultPrice ?? 10);
    const vatAmount = (net * 24) / 100;
    const total = net + vatAmount;
    const d = await prisma.document.create({
      data: {
        businessId: business.id,
        type: "invoice",
        status: "draft",
        clientId: client.id,
        issueDate: new Date(),
        netTotalAmount: net,
        vatTotalAmount: vatAmount,
        totalAmount: total,
        payableTotalAmount: total,
        notes: "[SEED] draft για QA",
        lines: {
          create: {
            ordinal: 0,
            description: lineItem?.name ?? "[SEED] line",
            quantity: 1,
            unit: "τμχ",
            unitPrice: net,
            discountPct: 0,
            vatRate: 24,
            netAmount: net,
            vatAmount,
            totalAmount: total,
            itemId: lineItem?.id ?? null,
          },
        },
      },
    });
    drafts.push(d.id);
  }

  await logAudit({
    userId: ctx.userId,
    businessId: business.id,
    action: "admin.seeder.run",
    entityType: "Business",
    entityId: business.id,
    meta: {
      clients: clients.length,
      items: items.length,
      drafts: drafts.length,
    },
  });

  revalidatePath("/admin/businesses");

  return {
    ok: true,
    businessId: business.id,
    summary: `Δημιουργήθηκε επιχείρηση ${business.legalName} με ${clients.length} πελάτες, ${items.length} είδη, ${drafts.length} πρόχειρα.`,
  };
}
