import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { toCsv, csvResponse } from "@/lib/csv";
import { toXlsxBuffer, xlsxResponse, type XlsxColumn } from "@/lib/xlsx";
import { toPdfBuffer, pdfResponse, type PdfColumn } from "@/lib/pdf/table-pdf";

type Row = Awaited<ReturnType<typeof loadRows>>[number];

async function loadRows(businessId: string) {
  return prisma.client.findMany({
    where: { businessId },
    orderBy: { legalName: "asc" },
    take: 5000,
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
    action: "export.clients",
    meta: { rows: rows.length, format },
  });

  if (format === "csv") {
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
    return csvResponse(csv, `timologion-clients-${today}.csv`);
  }

  if (format === "pdf") {
    const cols: PdfColumn<Row>[] = [
      { header: "Επωνυμία", value: (c) => c.legalName, weight: 2.5 },
      { header: "ΑΦΜ", value: (c) => c.vatNumber ?? "", weight: 1 },
      { header: "ΔΟΥ", value: (c) => c.taxOffice ?? "", weight: 1.4 },
      { header: "Πόλη", value: (c) => c.city ?? "", weight: 1.2 },
      { header: "Τηλέφωνο", value: (c) => c.phone ?? "", weight: 1.2 },
      { header: "Email", value: (c) => c.email ?? "", weight: 2.2 },
    ];
    const buf = await toPdfBuffer({
      title: "Πελάτες",
      subtitle: ctx.businessName,
      meta: [
        { label: "Πλήθος", value: String(rows.length) },
        { label: "Εξαγωγή", value: new Date().toLocaleDateString("el-GR") },
      ],
      rows,
      columns: cols,
      footerNote: "Παραγωγή: timologion.gr",
    });
    return pdfResponse(buf, `timologion-clients-${today}.pdf`);
  }

  const cols: XlsxColumn<Row>[] = [
    { header: "Επωνυμία", value: (c) => c.legalName, width: 34 },
    { header: "Διακριτικός τίτλος", value: (c) => c.tradeName ?? "", width: 26 },
    { header: "ΑΦΜ", value: (c) => c.vatNumber ?? "", width: 12 },
    { header: "ΔΟΥ", value: (c) => c.taxOffice ?? "", width: 18 },
    { header: "Δραστηριότητα", value: (c) => c.activity ?? "", width: 28 },
    { header: "Διεύθυνση", value: (c) => c.addressLine ?? "", width: 30 },
    { header: "Πόλη", value: (c) => c.city ?? "", width: 16 },
    { header: "Τ.Κ.", value: (c) => c.postalCode ?? "", width: 8 },
    { header: "Χώρα", value: (c) => c.country ?? "", width: 8 },
    { header: "Email", value: (c) => c.email ?? "", width: 26 },
    { header: "Τηλέφωνο", value: (c) => c.phone ?? "", width: 16 },
    { header: "Ημ. δημιουργίας", value: (c) => c.createdAt, format: "yyyy-mm-dd", width: 14 },
  ];
  const buf = await toXlsxBuffer(rows, cols, {
    sheetName: "Πελάτες",
    title: `Πελάτες — ${ctx.businessName}`,
  });
  return xlsxResponse(buf, `timologion-clients-${today}.xlsx`);
}
