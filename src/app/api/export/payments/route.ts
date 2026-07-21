import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { toCsv, csvResponse } from "@/lib/csv";

const METHOD_LABEL: Record<string, string> = {
  cash: "Μετρητά",
  card: "Κάρτα",
  bank_transfer: "Τραπεζική",
  iris: "IRIS",
  check: "Επιταγή",
  credit: "Επί πιστώσει",
  other: "Άλλο",
};

export async function GET() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:read");

  const rows = await prisma.payment.findMany({
    where: { businessId: ctx.businessId },
    orderBy: { receivedAt: "desc" },
    take: 10000,
    include: {
      client: { select: { legalName: true, vatNumber: true } },
      document: { select: { series: true, number: true } },
    },
  });

  const csv = toCsv(rows, [
    { header: "Ημερομηνία", value: (p) => p.receivedAt },
    { header: "Πελάτης", value: (p) => p.client?.legalName ?? "" },
    { header: "ΑΦΜ", value: (p) => p.client?.vatNumber ?? "" },
    {
      header: "Παραστατικό",
      value: (p) =>
        p.document
          ? `${p.document.series ?? ""}${p.document.number ? " #" + p.document.number : ""}`
          : "",
    },
    { header: "Ποσό", value: (p) => p.amount.toString() },
    { header: "Μέθοδος", value: (p) => METHOD_LABEL[p.method] ?? p.method },
    { header: "Αναφορά", value: (p) => p.reference ?? "" },
    { header: "Σημειώσεις", value: (p) => p.notes ?? "" },
  ]);

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "export.payments",
    meta: { rows: rows.length },
  });

  return csvResponse(csv, `timologion-payments-${new Date().toISOString().slice(0, 10)}.csv`);
}
