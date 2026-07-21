import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authorizeCron } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Weekly digest of unpaid & overdue issued documents. Delivered as a single
 * in-app notification per owner/admin so they can quickly triage. Emails can
 * later reuse the same aggregation.
 */
export async function GET(req: Request) {
  const unauth = authorizeCron(req);
  if (unauth) return unauth;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const businesses = await prisma.business.findMany({
    where: { suspendedAt: null },
    select: { id: true },
  });

  let created = 0;

  for (const b of businesses) {
    const [unpaid, sum] = await Promise.all([
      prisma.document.count({
        where: {
          businessId: b.id,
          status: "issued",
          paymentStatus: { in: ["unpaid", "partial"] },
        },
      }),
      prisma.document.aggregate({
        where: {
          businessId: b.id,
          status: "issued",
          paymentStatus: { in: ["unpaid", "partial"] },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    if (unpaid === 0) continue;

    const total = sum._sum.totalAmount ?? 0;
    const owners = await prisma.businessMember.findMany({
      where: {
        businessId: b.id,
        role: { in: ["owner", "admin", "accountant"] },
      },
      select: { userId: true },
    });

    for (const o of owners) {
      const already = await prisma.notification.count({
        where: {
          userId: o.userId,
          entityType: "UnpaidDigest",
          entityId: b.id,
          createdAt: { gte: startOfToday },
        },
      });
      if (already) continue;

      await prisma.notification.create({
        data: {
          userId: o.userId,
          businessId: b.id,
          tone: "info",
          title: "Εβδομαδιαία σύνοψη ανεξόφλητων",
          body: `Έχεις ${unpaid} ανοιχτά παραστατικά με συνολικό υπόλοιπο €${Number(total).toFixed(2)}.`,
          href: "/app/payments",
          entityType: "UnpaidDigest",
          entityId: b.id,
        },
      });
      created += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    businesses: businesses.length,
    notifications: created,
  });
}
