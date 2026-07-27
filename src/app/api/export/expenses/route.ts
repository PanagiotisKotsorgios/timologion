import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { toCsv, csvResponse } from "@/lib/csv";

const STATUS_LABEL: Record<string, string> = {
  unpaid: "Ανεξόφλητο",
  partial: "Μερικώς",
  paid: "Εξοφλημένο",
};

export async function GET() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:read");

  const rows = await prisma.expense.findMany({
    where: { businessId: ctx.businessId },
    orderBy: { issueDate: "desc" },
    take: 10000,
    include: {
      supplier: { select: { legalName: true, vatNumber: true } },
    },
  });

  const csv = toCsv(rows, [
    { header: "Ημερομηνία", value: (e) => e.issueDate },
    { header: "Προμηθευτής", value: (e) => e.supplier?.legalName ?? "" },
    { header: "ΑΦΜ", value: (e) => e.supplier?.vatNumber ?? "" },
    { header: "Παραστατικό", value: (e) => e.reference ?? "" },
    { header: "Κατηγορία", value: (e) => e.category ?? "" },
    { header: "Περιγραφή", value: (e) => e.description ?? "" },
    { header: "Καθαρή αξία", value: (e) => e.netAmount.toString() },
    { header: "ΦΠΑ %", value: (e) => e.vatRate.toString() },
    { header: "ΦΠΑ αξία", value: (e) => e.vatAmount.toString() },
    { header: "Σύνολο", value: (e) => e.totalAmount.toString() },
    { header: "Πληρώθηκε", value: (e) => e.paidAmount.toString() },
    {
      header: "Κατάσταση πληρωμής",
      value: (e) => STATUS_LABEL[e.paymentStatus] ?? e.paymentStatus,
    },
    { header: "Σημειώσεις", value: (e) => e.notes ?? "" },
  ]);

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "export.expenses",
    meta: { rows: rows.length },
  });

  return csvResponse(
    csv,
    `timologion-expenses-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}
