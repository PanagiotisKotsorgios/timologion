import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeLine, computeDocument } from "@/lib/totals";
import { authorizeCron } from "@/lib/cron-auth";
import { withCronLog } from "@/lib/cron-logger";
import { attemptIssueForBusiness } from "@/app/app/documents/actions";
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
  const wrapped = await withCronLog("recurring", () => runRecurring());
  if (!wrapped.ok) {
    return NextResponse.json({ ok: false, error: wrapped.error }, { status: 500 });
  }
  return NextResponse.json(wrapped.result);
}

async function runRecurring() {
  const now = new Date();
  const due = await prisma.recurringDocument.findMany({
    where: { status: "active", nextRunAt: { lte: now } },
    include: { billingBook: true },
    take: 200,
  });

  const results: {
    id: string;
    documentId?: string;
    transmitted?: boolean;
    transmitError?: string;
    error?: string;
  }[] = [];

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

      // Opt-in auto-transmit: when the template is flagged, hand the fresh
      // draft straight to myDATA. Failures are non-fatal — the doc simply
      // stays as a draft with lastWrappError set for the user to see next
      // login. We do NOT reschedule / undo `nextRunAt`, since the draft
      // still exists and can be transmitted manually.
      let transmitted: boolean | undefined;
      let transmitError: string | undefined;
      if (rec.autoTransmit) {
        try {
          const issued = await attemptIssueForBusiness(
            rec.businessId,
            null,
            doc.id,
          );
          if (issued.ok) {
            transmitted = true;
          } else {
            transmitted = false;
            transmitError = issued.error;
          }
        } catch (err) {
          transmitted = false;
          transmitError = err instanceof Error ? err.message : "unknown";
        }
      }

      results.push({
        id: rec.id,
        documentId: doc.id,
        transmitted,
        transmitError,
      });
    } catch (err) {
      results.push({
        id: rec.id,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return {
    result: { ok: true, processed: results.length, results },
    itemsDone: results.filter((r) => !r.error).length,
  };
}
