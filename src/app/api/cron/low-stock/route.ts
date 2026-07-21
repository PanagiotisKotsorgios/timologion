import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeCron } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Emits a "low stock" notification for each Item where stockOnHand <= stockAlertAt,
 * addressed to every active owner/admin of the business. Idempotent within a day.
 */
export async function GET(req: Request) {
  const unauth = authorizeCron(req);
  if (unauth) return unauth;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const lowItems = await prisma.item.findMany({
    where: {
      active: true,
      kind: "product",
      stockOnHand: { not: null },
      stockAlertAt: { not: null },
    },
    select: {
      id: true,
      name: true,
      businessId: true,
      stockOnHand: true,
      stockAlertAt: true,
      unit: true,
    },
    take: 2000,
  });

  const truly = lowItems.filter(
    (i) =>
      i.stockOnHand != null &&
      i.stockAlertAt != null &&
      Number(i.stockOnHand.toString()) <= Number(i.stockAlertAt.toString()),
  );

  let created = 0;
  for (const it of truly) {
    const owners = await prisma.businessMember.findMany({
      where: {
        businessId: it.businessId,
        role: { in: ["owner", "admin"] },
      },
      select: { userId: true },
    });
    for (const o of owners) {
      const already = await prisma.notification.count({
        where: {
          userId: o.userId,
          entityType: "Item",
          entityId: it.id,
          createdAt: { gte: startOfToday },
        },
      });
      if (already) continue;

      await prisma.notification.create({
        data: {
          userId: o.userId,
          businessId: it.businessId,
          tone: "warning",
          title: "Χαμηλό απόθεμα",
          body: `${it.name}: ${it.stockOnHand?.toString()} ${it.unit} — κάτω από το όριο (${it.stockAlertAt?.toString()}).`,
          href: `/app/items/${it.id}`,
          entityType: "Item",
          entityId: it.id,
        },
      });
      created += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: lowItems.length,
    lowStock: truly.length,
    notifications: created,
  });
}
