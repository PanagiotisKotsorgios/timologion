import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { toXlsxBuffer, xlsxResponse } from "@/lib/xlsx";
import { t } from "@/lib/i18n";

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
    orderBy: { issueDate: "asc" },
    include: {
      client: { select: { legalName: true, vatNumber: true } },
    },
  });

  const buf = await toXlsxBuffer(docs, [
    {
      header: "Ημ. έκδοσης",
      value: (d) => d.issueDate,
      format: "yyyy-mm-dd",
      width: 12,
    },
    { header: "Σειρά", value: (d) => d.series ?? "", width: 8 },
    { header: "Αριθμός", value: (d) => d.number ?? "", format: "0", width: 10 },
    { header: "Τύπος", value: (d) => t.documents.types[d.type] ?? d.type, width: 26 },
    { header: "Πελάτης", value: (d) => d.client?.legalName ?? "Λιανική", width: 30 },
    { header: "ΑΦΜ", value: (d) => d.client?.vatNumber ?? "", width: 12 },
    { header: "Καθαρή αξία", value: (d) => Number(d.netTotalAmount), format: "€#,##0.00", width: 14 },
    { header: "ΦΠΑ", value: (d) => Number(d.vatTotalAmount), format: "€#,##0.00", width: 12 },
    { header: "Σύνολο", value: (d) => Number(d.totalAmount), format: "€#,##0.00", width: 14 },
    { header: "Πληρωμή", value: (d) => d.paymentStatus, width: 12 },
    { header: "ΜΑΡΚ", value: (d) => d.myDataMark ?? "", width: 20 },
  ], {
    sheetName: "Έσοδα-Έξοδα",
    title: `Έσοδα-Έξοδα · ${from.toISOString().slice(0, 10)} → ${to.toISOString().slice(0, 10)}`,
  });

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "report.journal",
    meta: {
      from: from.toISOString(),
      to: to.toISOString(),
      docs: docs.length,
    },
  });

  const filename = `esoda-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.xlsx`;
  return xlsxResponse(buf, filename);
}
