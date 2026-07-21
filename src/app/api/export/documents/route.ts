import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { toCsv, csvResponse } from "@/lib/csv";
import { t } from "@/lib/i18n";

export async function GET() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:read");

  const rows = await prisma.document.findMany({
    where: { businessId: ctx.businessId },
    orderBy: { issueDate: "desc" },
    take: 10000,
    include: {
      client: { select: { legalName: true, vatNumber: true } },
    },
  });

  const csv = toCsv(rows, [
    { header: "Ημερομηνία", value: (d) => d.issueDate },
    { header: "Τύπος", value: (d) => t.documents.types[d.type] },
    { header: "Σειρά", value: (d) => d.series ?? "" },
    { header: "Αριθμός", value: (d) => d.number ?? "" },
    { header: "Πελάτης", value: (d) => d.client?.legalName ?? "" },
    { header: "ΑΦΜ πελάτη", value: (d) => d.client?.vatNumber ?? "" },
    { header: "Καθαρή αξία", value: (d) => d.netTotalAmount.toString() },
    { header: "ΦΠΑ", value: (d) => d.vatTotalAmount.toString() },
    { header: "Σύνολο", value: (d) => d.totalAmount.toString() },
    { header: "Κατάσταση", value: (d) => d.status },
    { header: "Πληρωμή", value: (d) => d.paymentStatus },
    { header: "MARK", value: (d) => d.myDataMark ?? "" },
    { header: "UID", value: (d) => d.myDataUid ?? "" },
    { header: "Μέθοδος πληρωμής", value: (d) => d.paymentMethod ?? "" },
  ]);

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "export.documents",
    meta: { rows: rows.length },
  });

  return csvResponse(csv, `timologion-documents-${new Date().toISOString().slice(0, 10)}.csv`);
}
