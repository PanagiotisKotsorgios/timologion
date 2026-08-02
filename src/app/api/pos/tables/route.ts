import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";

/**
 * Lightweight JSON feed for the POS TableManager modal — powers the
 * client-side list so add/remove can refresh without a full page nav.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:read");

  const tables = await prisma.posTable.findMany({
    where: { businessId: ctx.businessId },
    orderBy: { label: "asc" },
    include: {
      _count: {
        select: {
          tabs: { where: { status: "open" } },
        },
      },
    },
  });

  return NextResponse.json({
    tables: tables.map((t) => ({
      id: t.id,
      label: t.label,
      seats: t.seats,
      hasOpenTab: t._count.tabs > 0,
    })),
  });
}
