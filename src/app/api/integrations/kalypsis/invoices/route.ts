import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DocumentType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireKalypsisApiKey, unauthorized } from "@/lib/integrations/kalypsis";

export const dynamic = "force-dynamic";

const lineSchema = z.object({
  description: z.string().min(1).max(255),
  quantity: z.coerce.number().positive(),
  unit: z.string().max(20).default("τεμ."),
  unitPrice: z.coerce.number().nonnegative(),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  vatRate: z.coerce.number().min(0).max(100).default(24),
});
const schema = z.object({
  type: z.nativeEnum(DocumentType), clientId: z.string().nullable().optional(),
  issueDate: z.string().optional(), series: z.string().max(20).nullable().optional(),
  paymentMethod: z.string().max(80).nullable().optional(), notes: z.string().max(5000).nullable().optional(),
  lines: z.array(lineSchema).min(1).max(200),
});

export async function POST(request: NextRequest) {
  const auth = await requireKalypsisApiKey(request);
  if (!auth) return unauthorized();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Μη έγκυρα στοιχεία παραστατικού." }, { status: 400 });
  const b = parsed.data;
  if (b.clientId) {
    const client = await prisma.client.findFirst({ where: { id: b.clientId, businessId: auth.businessId }, select: { id: true } });
    if (!client) return NextResponse.json({ ok: false, error: "Ο πελάτης δεν ανήκει στην επιχείρηση." }, { status: 400 });
  }
  const computed = b.lines.map((line, index) => {
    const net = line.quantity * line.unitPrice * (1 - line.discountPct / 100);
    const vat = net * line.vatRate / 100;
    return { ordinal: index, ...line, netAmount: Number(net.toFixed(2)), vatAmount: Number(vat.toFixed(2)), totalAmount: Number((net + vat).toFixed(2)) };
  });
  const netTotalAmount = Number(computed.reduce((s, x) => s + x.netAmount, 0).toFixed(2));
  const vatTotalAmount = Number(computed.reduce((s, x) => s + x.vatAmount, 0).toFixed(2));
  const doc = await prisma.document.create({
    data: {
      businessId: auth.businessId, clientId: b.clientId ?? null, type: b.type,
      status: "draft", series: b.series ?? null, issueDate: b.issueDate ? new Date(b.issueDate) : new Date(),
      paymentMethod: b.paymentMethod ?? null, notes: b.notes ?? null,
      netTotalAmount, vatTotalAmount, totalAmount: Number((netTotalAmount + vatTotalAmount).toFixed(2)),
      payableTotalAmount: Number((netTotalAmount + vatTotalAmount).toFixed(2)),
      lines: { create: computed },
    },
    include: { lines: true, client: { select: { id: true, legalName: true, vatNumber: true } } },
  });
  return NextResponse.json({ ok: true, mode: "draft", production: false, document: doc }, { status: 201 });
}
