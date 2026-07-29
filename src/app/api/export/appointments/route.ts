import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { toCsv, csvResponse } from "@/lib/csv";
import { toXlsxBuffer, xlsxResponse, type XlsxColumn } from "@/lib/xlsx";
import { toPdfBuffer, pdfResponse, type PdfColumn } from "@/lib/pdf/table-pdf";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Προγραμματισμένο",
  completed: "Ολοκληρωμένο",
  cancelled: "Ακυρωμένο",
  no_show: "No-show",
};

type Row = Awaited<ReturnType<typeof loadRows>>[number];

async function loadRows(businessId: string) {
  return prisma.appointment.findMany({
    where: { businessId },
    orderBy: { startAt: "desc" },
    take: 10000,
    include: {
      client: { select: { legalName: true, vatNumber: true } },
      staff: { select: { fullName: true } },
      item: { select: { name: true } },
    },
  });
}

export async function GET(req: Request) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:read");

  const format = (new URL(req.url).searchParams.get("format") ?? "xlsx").toLowerCase();
  const rows = await loadRows(ctx.businessId);
  const today = new Date().toISOString().slice(0, 10);

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "export.appointments",
    meta: { rows: rows.length, format },
  });

  if (format === "csv") {
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
      { header: "Κατάσταση", value: (a) => STATUS_LABEL[a.status] ?? a.status },
      { header: "Σημειώσεις", value: (a) => a.notes ?? "" },
    ]);
    return csvResponse(csv, `timologion-appointments-${today}.csv`);
  }

  if (format === "pdf") {
    const cols: PdfColumn<Row>[] = [
      { header: "Έναρξη", value: (a) => a.startAt, format: "datetime", weight: 1.4 },
      { header: "Πελάτης", value: (a) => a.client?.legalName ?? "", weight: 2 },
      { header: "Υπηρεσία", value: (a) => a.serviceName, weight: 2 },
      { header: "Ανάθεση", value: (a) => a.staff?.fullName ?? "", weight: 1.4 },
      {
        header: "Τιμή",
        value: (a) => (a.priceOverride ? Number(a.priceOverride) : null),
        format: "money",
        align: "right",
        weight: 1,
      },
      {
        header: "Κατάσταση",
        value: (a) => STATUS_LABEL[a.status] ?? a.status,
        weight: 1.2,
      },
    ];
    const buf = await toPdfBuffer({
      title: "Ραντεβού",
      subtitle: ctx.businessName,
      meta: [
        { label: "Πλήθος", value: String(rows.length) },
        { label: "Εξαγωγή", value: new Date().toLocaleDateString("el-GR") },
      ],
      rows,
      columns: cols,
      footerNote: "Παραγωγή: timologion.gr",
    });
    return pdfResponse(buf, `timologion-appointments-${today}.pdf`);
  }

  const cols: XlsxColumn<Row>[] = [
    { header: "Έναρξη", value: (a) => a.startAt, format: "yyyy-mm-dd hh:mm", width: 18 },
    { header: "Λήξη", value: (a) => a.endAt, format: "yyyy-mm-dd hh:mm", width: 18 },
    { header: "Πελάτης", value: (a) => a.client?.legalName ?? "", width: 28 },
    { header: "ΑΦΜ", value: (a) => a.client?.vatNumber ?? "", width: 12 },
    { header: "Υπηρεσία", value: (a) => a.serviceName, width: 28 },
    { header: "Από κατάλογο", value: (a) => a.item?.name ?? "", width: 22 },
    { header: "Ανάθεση", value: (a) => a.staff?.fullName ?? "", width: 20 },
    {
      header: "Τιμή",
      value: (a) => (a.priceOverride ? Number(a.priceOverride) : null),
      format: "€#,##0.00",
      width: 12,
    },
    {
      header: "ΦΠΑ %",
      value: (a) => (a.vatRate ? Number(a.vatRate) : null),
      format: "0.00",
      width: 10,
    },
    {
      header: "Κατάσταση",
      value: (a) => STATUS_LABEL[a.status] ?? a.status,
      width: 16,
    },
    { header: "Σημειώσεις", value: (a) => a.notes ?? "", width: 32 },
  ];
  const buf = await toXlsxBuffer(rows, cols, {
    sheetName: "Ραντεβού",
    title: `Ραντεβού — ${ctx.businessName}`,
  });
  return xlsxResponse(buf, `timologion-appointments-${today}.xlsx`);
}
