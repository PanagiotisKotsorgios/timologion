import { NextRequest, NextResponse } from "next/server";
import { DocumentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireKalypsisApiKey, unauthorized } from "@/lib/integrations/kalypsis";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireKalypsisApiKey(request);
  if (!auth) return unauthorized();
  const params = new URL(request.url).searchParams;
  const rawStatus = params.get("status") || undefined;
  const status = rawStatus && Object.values(DocumentStatus).includes(rawStatus as DocumentStatus)
    ? rawStatus as DocumentStatus
    : undefined;
  const rows = await prisma.document.findMany({
    where: {
      businessId: auth.businessId,
      ...(status ? { status } : {}),
    },
    orderBy: { issueDate: "desc" },
    take: 1000,
    include: {
      client: { select: { id: true, legalName: true, vatNumber: true, email: true } },
      lines: true,
    },
  });
  return NextResponse.json({ ok: true, documents: rows });
}
