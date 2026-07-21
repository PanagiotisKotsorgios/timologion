import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:read");

  const rows = await prisma.client.findMany({
    where: { businessId: ctx.businessId },
    orderBy: { legalName: "asc" },
    take: 5000,
  });

  const csv = toCsv(rows, [
    { header: "Επωνυμία", value: (c) => c.legalName },
    { header: "Διακριτικός τίτλος", value: (c) => c.tradeName ?? "" },
    { header: "ΑΦΜ", value: (c) => c.vatNumber ?? "" },
    { header: "ΔΟΥ", value: (c) => c.taxOffice ?? "" },
    { header: "Δραστηριότητα", value: (c) => c.activity ?? "" },
    { header: "Διεύθυνση", value: (c) => c.addressLine ?? "" },
    { header: "Πόλη", value: (c) => c.city ?? "" },
    { header: "Τ.Κ.", value: (c) => c.postalCode ?? "" },
    { header: "Χώρα", value: (c) => c.country ?? "" },
    { header: "Email", value: (c) => c.email ?? "" },
    { header: "Τηλέφωνο", value: (c) => c.phone ?? "" },
    { header: "Ημερομηνία δημιουργίας", value: (c) => c.createdAt },
  ]);

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "export.clients",
    meta: { rows: rows.length },
  });

  return csvResponse(csv, `timologion-clients-${today()}.csv`);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
