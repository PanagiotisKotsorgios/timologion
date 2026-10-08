import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireKalypsisApiKey, unauthorized } from "@/lib/integrations/kalypsis";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireKalypsisApiKey(request);
  if (!auth) return unauthorized();

  const [business, wrapp, clients, documents] = await Promise.all([
    prisma.business.findUnique({
      where: { id: auth.businessId },
      select: { id: true, legalName: true, tradeName: true, vatNumber: true, email: true },
    }),
    prisma.wrappConnection.findUnique({
      where: { businessId: auth.businessId },
      select: { status: true, canIssueInvoice: true, hasPlan: true, lastVerifiedAt: true },
    }),
    prisma.client.count({ where: { businessId: auth.businessId } }),
    prisma.document.count({ where: { businessId: auth.businessId } }),
  ]);

  return NextResponse.json({
    ok: true,
    business,
    wrapp: wrapp
      ? { ...wrapp, lastVerifiedAt: wrapp.lastVerifiedAt?.toISOString() ?? null }
      : { status: "inactive", canIssueInvoice: false, hasPlan: false, lastVerifiedAt: null },
    counts: { clients, documents },
    capabilities: {
      customers: true,
      documents: true,
      drafts: true,
      preview: true,
      issue: Boolean(wrapp?.status === "active" && wrapp.canIssueInvoice),
      payments: true,
      exports: true,
    },
  });
}
