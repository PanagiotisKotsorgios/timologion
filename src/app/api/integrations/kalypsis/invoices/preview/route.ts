import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DocumentType } from "@prisma/client";
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
  type: z.nativeEnum(DocumentType),
  clientId: z.string().nullable().optional(),
  issueDate: z.string().optional(),
  paymentMethod: z.string().max(80).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  lines: z.array(lineSchema).min(1).max(200),
});

export async function POST(request: NextRequest) {
  const auth = await requireKalypsisApiKey(request);
  if (!auth) return unauthorized();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Μη έγκυρα στοιχεία παραστατικού." }, { status: 400 });
  const lines = parsed.data.lines.map((line, index) => {
    const net = line.quantity * line.unitPrice * (1 - line.discountPct / 100);
    const vat = net * line.vatRate / 100;
    return { ordinal: index, ...line, netAmount: Number(net.toFixed(2)), vatAmount: Number(vat.toFixed(2)), totalAmount: Number((net + vat).toFixed(2)) };
  });
  const netTotal = Number(lines.reduce((s, x) => s + x.netAmount, 0).toFixed(2));
  const vatTotal = Number(lines.reduce((s, x) => s + x.vatAmount, 0).toFixed(2));
  return NextResponse.json({
    ok: true,
    mode: "preview",
    production: false,
    document: {
      businessId: auth.businessId,
      type: parsed.data.type,
      clientId: parsed.data.clientId ?? null,
      issueDate: parsed.data.issueDate ?? new Date().toISOString(),
      paymentMethod: parsed.data.paymentMethod ?? null,
      notes: parsed.data.notes ?? null,
      lines,
      netTotalAmount: netTotal,
      vatTotalAmount: vatTotal,
      totalAmount: Number((netTotal + vatTotal).toFixed(2)),
    },
  });
}
