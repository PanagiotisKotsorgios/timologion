import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeLine, computeDocument } from "@/lib/totals";
import { authorizeCron } from "@/lib/cron-auth";
import type { RecurrenceCadence } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LineTemplate = {
  itemId?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  discountPct: number;
};

function addByCadence(from: Date, cadence: RecurrenceCadence): Date {
  const d = new Date(from);
  if (cadence === "weekly") d.setDate(d.getDate() + 7);
  else if (cadence === "monthly") d.setMonth(d.getMonth() + 1);
  else if (cadence === "quarterly") d.setMonth(d.getMonth() + 3);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
}

export async function GET(req: Request) {
  const unauth = authorizeCron(req);
  if (unauth) return unauth;

  const now = new Date();
  const due = await prisma.recurringDocument.findMany({
    where: { status: "active", nextRunAt: { lte: now } },
    include: { billingBook: true },
    take: 200,
  });

  const results: { id: string; documentId?: string; error?: string }[] = [];

  for (const rec of due) {
    try {
      const lines = JSON.parse(rec.linesJson) as LineTemplate[];
      const totals = computeDocument(lines);

      const doc = await prisma.$transaction(async (tx) => {
        const created = await tx.document.create({
          data: {
            businessId: rec.businessId,
            clientId: rec.clientId,
            branchId: rec.branchId,
            billingBookId: rec.billingBookId,
            type: rec.type,
            status: "draft",
            series: rec.billingBook?.series ?? null,
            issueDate: now,
            paymentMethod: rec.paymentMethod,
            notes: rec.notes,
            netTotalAmount: totals.netTotal,
            vatTotalAmount: totals.vatTotal,
            totalAmount: totals.total,
            payableTotalAmount: totals.total,
          },
        });

        await tx.documentLine.createMany({
          data: lines.map((line, i) => {
            const t = computeLine(line);
            return {
              documentId: created.id,
              itemId: line.itemId || null,
              ordinal: i,
              description: line.description,
              quantity: line.quantity,
              unit: line.unit || "τμχ",
              unitPrice: line.unitPrice,
              discountPct: line.discountPct ?? 0,
              vatRate: line.vatRate,
              netAmount: t.net,
              vatAmount: t.vat,
              totalAmount: t.total,
            };
          }),
        });

        await tx.recurringDocument.update({
          where: { id: rec.id },
          data: {
            lastRunAt: now,
            nextRunAt: addByCadence(now, rec.cadence),
          },
        });

        return created;
      });

      results.push({ id: rec.id, documentId: doc.id });
    } catch (err) {
      results.push({
        id: rec.id,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    results,
  });
}
