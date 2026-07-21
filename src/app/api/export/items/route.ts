import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "item:read");

  const rows = await prisma.item.findMany({
    where: { businessId: ctx.businessId },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    take: 5000,
  });

  const csv = toCsv(rows, [
    { header: "Τύπος", value: (i) => (i.kind === "product" ? "Προϊόν" : "Υπηρεσία") },
    { header: "Κωδικός", value: (i) => i.code ?? "" },
    { header: "Ονομασία", value: (i) => i.name },
    { header: "Μονάδα", value: (i) => i.unit },
    { header: "Τιμή", value: (i) => i.defaultPrice.toString() },
    { header: "ΦΠΑ %", value: (i) => i.vatRate.toString() },
    { header: "Κατηγορία ΦΠΑ", value: (i) => i.vatCategory ?? "" },
    { header: "Περιγραφή", value: (i) => i.description ?? "" },
    { header: "Ενεργό", value: (i) => (i.active ? "Ναι" : "Όχι") },
  ]);

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "export.items",
    meta: { rows: rows.length },
  });

  return csvResponse(csv, `timologion-items-${new Date().toISOString().slice(0, 10)}.csv`);
}
