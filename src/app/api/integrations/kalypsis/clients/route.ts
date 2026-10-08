import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireKalypsisApiKey, unauthorized } from "@/lib/integrations/kalypsis";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireKalypsisApiKey(request);
  if (!auth) return unauthorized();
  const search = new URL(request.url).searchParams.get("search")?.trim() ?? "";
  const rows = await prisma.client.findMany({
    where: {
      businessId: auth.businessId,
      ...(search
        ? { OR: [{ legalName: { contains: search } }, { vatNumber: { contains: search } }, { email: { contains: search } }] }
        : {}),
    },
    orderBy: { legalName: "asc" },
    take: 2000,
    select: {
      id: true, legalName: true, tradeName: true, vatNumber: true, taxOffice: true,
      activity: true, addressLine: true, city: true, postalCode: true, country: true,
      email: true, phone: true, notes: true,
    },
  });
  return NextResponse.json({ ok: true, clients: rows });
}

const upsertSchema = z.object({
  externalId: z.string().min(1).max(80).optional(),
  legalName: z.string().min(1).max(160),
  tradeName: z.string().max(160).nullable().optional(),
  vatNumber: z.string().max(20).nullable().optional(),
  taxOffice: z.string().max(120).nullable().optional(),
  activity: z.string().max(200).nullable().optional(),
  addressLine: z.string().max(200).nullable().optional(),
  city: z.string().max(80).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  country: z.string().max(2).default("GR"),
  email: z.string().email().max(160).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

/** Idempotent customer sync endpoint. Kalypsis sends its customer id in
 * notes until Timologion has a dedicated external-id column; VAT/email/name
 * matching keeps repeated syncs from creating duplicates. */
export async function POST(request: NextRequest) {
  const auth = await requireKalypsisApiKey(request);
  if (!auth) return unauthorized();
  const parsed = upsertSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Μη έγκυρα στοιχεία πελάτη." }, { status: 400 });
  const b = parsed.data;
  const existing = await prisma.client.findFirst({
    where: {
      businessId: auth.businessId,
      OR: [
        ...(b.vatNumber ? [{ vatNumber: b.vatNumber }] : []),
        ...(b.email ? [{ email: b.email }] : []),
        { legalName: b.legalName },
      ],
    },
  });
  const data = {
    legalName: b.legalName,
    tradeName: b.tradeName ?? null,
    vatNumber: b.vatNumber ?? null,
    taxOffice: b.taxOffice ?? null,
    activity: b.activity ?? null,
    addressLine: b.addressLine ?? null,
    city: b.city ?? null,
    postalCode: b.postalCode ?? null,
    country: b.country.toUpperCase(),
    email: b.email ?? null,
    phone: b.phone ?? null,
    notes: b.notes ?? null,
  };
  const client = existing
    ? await prisma.client.update({ where: { id: existing.id }, data })
    : await prisma.client.create({ data: { businessId: auth.businessId, ...data } });
  return NextResponse.json({ ok: true, created: !existing, client });
}
