import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { toCsv, csvResponse } from "@/lib/csv";
import { toXlsxBuffer, xlsxResponse, type XlsxColumn } from "@/lib/xlsx";
import { toPdfBuffer, pdfResponse, type PdfColumn } from "@/lib/pdf/table-pdf";
import { t } from "@/lib/i18n";

type Row = Awaited<ReturnType<typeof loadRows>>[number];

async function loadRows(businessId: string) {
  return prisma.document.findMany({
    where: { businessId },
    orderBy: { issueDate: "desc" },
    take: 10000,
    include: {
      client: { select: { legalName: true, vatNumber: true } },
    },
  });
}

export async function GET(req: Request) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:read");

  const format = (new URL(req.url).searchParams.get("format") ?? "xlsx").toLowerCase();
  const rows = await loadRows(ctx.businessId);
  const today = new Date().toISOString().slice(0, 10);

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "export.documents",
    meta: { rows: rows.length, format },
  });

  if (format === "csv") {
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
    return csvResponse(csv, `timologion-documents-${today}.csv`);
  }

  if (format === "pdf") {
    const cols: PdfColumn<Row>[] = [
      { header: "Ημ/νία", value: (d) => d.issueDate, format: "date", weight: 1 },
      { header: "Τύπος", value: (d) => t.documents.types[d.type], weight: 1.6 },
      { header: "Σειρά", value: (d) => d.series ?? "", weight: 0.6 },
      { header: "Αρ.", value: (d) => d.number ?? "", weight: 0.6, align: "right" },
      { header: "Πελάτης", value: (d) => d.client?.legalName ?? "", weight: 2.2 },
      { header: "ΑΦΜ", value: (d) => d.client?.vatNumber ?? "", weight: 0.9 },
      { header: "Καθαρή", value: (d) => d.netTotalAmount, format: "money", align: "right", weight: 1 },
      { header: "ΦΠΑ", value: (d) => d.vatTotalAmount, format: "money", align: "right", weight: 0.9 },
      { header: "Σύνολο", value: (d) => d.totalAmount, format: "money", align: "right", weight: 1 },
      { header: "Κατάσταση", value: (d) => d.status, weight: 0.9 },
    ];
    const total = rows.reduce((s, d) => s + Number(d.totalAmount), 0);
    const buf = await toPdfBuffer({
      title: "Παραστατικά",
      subtitle: ctx.businessName,
      meta: [
        { label: "Εγγραφές", value: String(rows.length) },
        { label: "Συνολική αξία", value: `${total.toFixed(2)} €` },
        { label: "Εξαγωγή", value: new Date().toLocaleDateString("el-GR") },
      ],
      rows,
      columns: cols,
      footerNote: "Παραγωγή: timologion.gr",
    });
    return pdfResponse(buf, `timologion-documents-${today}.pdf`);
  }

  const cols: XlsxColumn<Row>[] = [
    { header: "Ημερομηνία", value: (d) => d.issueDate, format: "yyyy-mm-dd", width: 12 },
    { header: "Τύπος", value: (d) => t.documents.types[d.type], width: 26 },
    { header: "Σειρά", value: (d) => d.series ?? "", width: 8 },
    { header: "Αριθμός", value: (d) => d.number ?? "", format: "0", width: 10 },
    { header: "Πελάτης", value: (d) => d.client?.legalName ?? "", width: 32 },
    { header: "ΑΦΜ πελάτη", value: (d) => d.client?.vatNumber ?? "", width: 12 },
    { header: "Καθαρή αξία", value: (d) => d.netTotalAmount, format: "€#,##0.00", width: 14 },
    { header: "ΦΠΑ", value: (d) => d.vatTotalAmount, format: "€#,##0.00", width: 12 },
    { header: "Σύνολο", value: (d) => d.totalAmount, format: "€#,##0.00", width: 14 },
    { header: "Κατάσταση", value: (d) => d.status, width: 12 },
    { header: "Πληρωμή", value: (d) => d.paymentStatus, width: 12 },
    { header: "MARK", value: (d) => d.myDataMark ?? "", width: 20 },
    { header: "UID", value: (d) => d.myDataUid ?? "", width: 24 },
    { header: "Μέθοδος πληρωμής", value: (d) => d.paymentMethod ?? "", width: 18 },
  ];
  const buf = await toXlsxBuffer(rows, cols, {
    sheetName: "Παραστατικά",
    title: `Παραστατικά — ${ctx.businessName}`,
  });
  return xlsxResponse(buf, `timologion-documents-${today}.xlsx`);
}
