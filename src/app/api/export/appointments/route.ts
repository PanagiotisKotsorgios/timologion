import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { toCsv, csvResponse } from "@/lib/csv";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Προγραμματισμένο",
  completed: "Ολοκληρωμένο",
  cancelled: "Ακυρωμένο",
  no_show: "No-show",
};

export async function GET() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:read");

  const rows = await prisma.appointment.findMany({
    where: { businessId: ctx.businessId },
    orderBy: { startAt: "desc" },
    take: 10000,
    include: {
      client: { select: { legalName: true, vatNumber: true } },
      staff: { select: { fullName: true } },
      item: { select: { name: true } },
    },
  });

  const csv = toCsv(rows, [
    { header: "Έναρξη", value: (a) => a.startAt },
    { header: "Λήξη", value: (a) => a.endAt },
    { header: "Πελάτης", value: (a) => a.client?.legalName ?? "" },
    { header: "ΑΦΜ", value: (a) => a.client?.vatNumber ?? "" },
    { header: "Υπηρεσία", value: (a) => a.serviceName },
    { header: "Από κατάλογο", value: (a) => a.item?.name ?? "" },
    { header: "Ανάθεση", value: (a) => a.staff?.fullName ?? "" },
    {
      header: "Τιμή",
      value: (a) => (a.priceOverride ? a.priceOverride.toString() : ""),
    },
    {
      header: "ΦΠΑ %",
      value: (a) => (a.vatRate ? a.vatRate.toString() : ""),
    },
    {
      header: "Κατάσταση",
      value: (a) => STATUS_LABEL[a.status] ?? a.status,
    },
    { header: "Σημειώσεις", value: (a) => a.notes ?? "" },
  ]);

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "export.appointments",
    meta: { rows: rows.length },
  });

  return csvResponse(
    csv,
    `timologion-appointments-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}
