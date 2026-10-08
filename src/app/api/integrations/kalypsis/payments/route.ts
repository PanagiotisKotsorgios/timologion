import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireKalypsisApiKey, unauthorized } from "@/lib/integrations/kalypsis";

export const dynamic = "force-dynamic";

/** Read-only payment ledger for the Kalypsis accounting workspace. Recording
 * a payment remains an explicit Timologion action; this endpoint never sends
 * anything to Wrapp/myDATA. */
export async function GET(request: NextRequest) {
  const auth = await requireKalypsisApiKey(request);
  if (!auth) return unauthorized();
  const params = new URL(request.url).searchParams;
  const clientId = params.get("clientId") || undefined;
  const documentId = params.get("documentId") || undefined;
  const rows = await prisma.payment.findMany({
    where: {
      businessId: auth.businessId,
      ...(clientId ? { clientId } : {}),
      ...(documentId ? { documentId } : {}),
    },
    orderBy: { receivedAt: "desc" },
    take: 2000,
    include: {
      client: { select: { id: true, legalName: true, vatNumber: true } },
      document: { select: { id: true, type: true, series: true, number: true, totalAmount: true } },
    },
  });
  return NextResponse.json({ ok: true, payments: rows });
}
