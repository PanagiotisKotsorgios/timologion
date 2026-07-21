import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { toCsv, csvResponse } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePeriod(url: URL) {
  const now = new Date();
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const from = fromParam
    ? new Date(fromParam)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = toParam
    ? new Date(new Date(toParam).setHours(23, 59, 59, 999))
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from, to };
}

export async function GET(req: Request) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:read");

  const { from, to } = parsePeriod(new URL(req.url));

  const docs = await prisma.document.findMany({
    where: {
      businessId: ctx.businessId,
      status: "issued",
      issueDate: { gte: from, lte: to },
    },
    select: {
      lines: { select: { netAmount: true, vatAmount: true, vatRate: true } },
    },
  });

  const perRate = new Map<
    string,
    { rate: string; net: number; vat: number; total: number }
  >();
  for (const d of docs) {
    for (const l of d.lines) {
      const rate = l.vatRate.toString();
      const bucket = perRate.get(rate) ?? { rate, net: 0, vat: 0, total: 0 };
      bucket.net += Number(l.netAmount);
      bucket.vat += Number(l.vatAmount);
      bucket.total = bucket.net + bucket.vat;
      perRate.set(rate, bucket);
    }
  }

  const rows = [...perRate.values()].sort(
    (a, b) => Number(b.rate) - Number(a.rate),
  );

  const totals = rows.reduce(
    (acc, r) => ({
      net: acc.net + r.net,
      vat: acc.vat + r.vat,
      total: acc.total + r.total,
    }),
    { net: 0, vat: 0, total: 0 },
  );

  const csv = toCsv(
    [
      ...rows,
      { rate: "ΣΥΝΟΛΟ", net: totals.net, vat: totals.vat, total: totals.total },
    ],
    [
      { header: "Συντελεστής ΦΠΑ", value: (r) => r.rate },
      { header: "Καθαρή αξία", value: (r) => r.net.toFixed(2) },
      { header: "ΦΠΑ", value: (r) => r.vat.toFixed(2) },
      { header: "Σύνολο", value: (r) => r.total.toFixed(2) },
    ],
  );

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "report.vat",
    meta: {
      from: from.toISOString(),
      to: to.toISOString(),
      docs: docs.length,
    },
  });

  const filename = `fpa-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv`;
  return csvResponse(csv, filename);
}
