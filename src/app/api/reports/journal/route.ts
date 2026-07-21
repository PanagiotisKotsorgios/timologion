import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { toCsv, csvResponse } from "@/lib/csv";
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
      client: {
        select: { legalName: true, vatNumber: true },
      },
    },
  });

  const csv = toCsv(docs, [
    { header: "Ημ. έκδοσης", value: (d) => d.issueDate.toISOString().slice(0, 10) },
    { header: "Σειρά", value: (d) => d.series ?? "" },
    { header: "Αριθμός", value: (d) => d.number ?? "" },
    { header: "Τύπος", value: (d) => t.documents.types[d.type] ?? d.type },
    { header: "Πελάτης", value: (d) => d.client?.legalName ?? "Λιανική" },
    { header: "ΑΦΜ", value: (d) => d.client?.vatNumber ?? "" },
    { header: "Καθαρή αξία", value: (d) => Number(d.netTotalAmount).toFixed(2) },
    { header: "ΦΠΑ", value: (d) => Number(d.vatTotalAmount).toFixed(2) },
    { header: "Σύνολο", value: (d) => Number(d.totalAmount).toFixed(2) },
    { header: "Πληρωμή", value: (d) => d.paymentStatus },
    { header: "ΜΑΡΚ", value: (d) => d.myDataMark ?? "" },
  ]);

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

  const filename = `esoda-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv`;
  return csvResponse(csv, filename);
}
