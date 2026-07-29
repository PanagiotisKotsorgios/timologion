import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { toCsv, csvResponse } from "@/lib/csv";
import { toXlsxBuffer, xlsxResponse, type XlsxColumn } from "@/lib/xlsx";
import { toPdfBuffer, pdfResponse, type PdfColumn } from "@/lib/pdf/table-pdf";

const METHOD_LABEL: Record<string, string> = {
  cash: "Μετρητά",
  card: "Κάρτα",
  bank_transfer: "Τραπεζική",
  iris: "IRIS",
  check: "Επιταγή",
  credit: "Επί πιστώσει",
  other: "Άλλο",
};

type Row = Awaited<ReturnType<typeof loadRows>>[number];

async function loadRows(businessId: string) {
  return prisma.payment.findMany({
    where: { businessId },
    orderBy: { receivedAt: "desc" },
    take: 10000,
    include: {
      client: { select: { legalName: true, vatNumber: true } },
      document: { select: { series: true, number: true } },
    },
  });
}

function docLabel(p: Row): string {
  return p.document
    ? `${p.document.series ?? ""}${p.document.number ? " #" + p.document.number : ""}`
    : "";
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
    action: "export.payments",
    meta: { rows: rows.length, format },
  });

  if (format === "csv") {
    const csv = toCsv(rows, [
      { header: "Ημερομηνία", value: (p) => p.receivedAt },
      { header: "Πελάτης", value: (p) => p.client?.legalName ?? "" },
      { header: "ΑΦΜ", value: (p) => p.client?.vatNumber ?? "" },
      { header: "Παραστατικό", value: docLabel },
      { header: "Ποσό", value: (p) => p.amount.toString() },
      { header: "Μέθοδος", value: (p) => METHOD_LABEL[p.method] ?? p.method },
      { header: "Αναφορά", value: (p) => p.reference ?? "" },
      { header: "Σημειώσεις", value: (p) => p.notes ?? "" },
    ]);
    return csvResponse(csv, `timologion-payments-${today}.csv`);
  }

  if (format === "pdf") {
    const pdfColumns: PdfColumn<Row>[] = [
      { header: "Ημερομηνία", value: (p) => p.receivedAt, format: "date", weight: 1 },
      { header: "Πελάτης", value: (p) => p.client?.legalName ?? "", weight: 2.5 },
      { header: "ΑΦΜ", value: (p) => p.client?.vatNumber ?? "", weight: 1 },
      { header: "Παραστατικό", value: docLabel, weight: 1.2 },
      { header: "Ποσό", value: (p) => p.amount, format: "money", align: "right", weight: 1 },
      { header: "Μέθοδος", value: (p) => METHOD_LABEL[p.method] ?? p.method, weight: 1 },
      { header: "Αναφορά", value: (p) => p.reference ?? "", weight: 1.2 },
    ];
    const total = rows.reduce((s, p) => s + Number(p.amount), 0);
    const buf = await toPdfBuffer({
      title: "Εισπράξεις",
      subtitle: ctx.businessName,
      meta: [
        { label: "Εγγραφές", value: String(rows.length) },
        { label: "Συνολικό ποσό", value: `${total.toFixed(2)} €` },
        { label: "Εξαγωγή", value: new Date().toLocaleDateString("el-GR") },
      ],
      rows,
      columns: pdfColumns,
      footerNote: "Παραγωγή: timologion.gr",
    });
    return pdfResponse(buf, `timologion-payments-${today}.pdf`);
  }

  // Default: xlsx
  const xlsxColumns: XlsxColumn<Row>[] = [
    { header: "Ημερομηνία", value: (p) => p.receivedAt, format: "yyyy-mm-dd", width: 12 },
    { header: "Πελάτης", value: (p) => p.client?.legalName ?? "", width: 32 },
    { header: "ΑΦΜ", value: (p) => p.client?.vatNumber ?? "", width: 12 },
    { header: "Παραστατικό", value: docLabel, width: 16 },
    { header: "Ποσό", value: (p) => p.amount, format: "€#,##0.00", width: 12 },
    { header: "Μέθοδος", value: (p) => METHOD_LABEL[p.method] ?? p.method, width: 14 },
    { header: "Αναφορά", value: (p) => p.reference ?? "", width: 20 },
    { header: "Σημειώσεις", value: (p) => p.notes ?? "", width: 32 },
  ];
  const buf = await toXlsxBuffer(rows, xlsxColumns, {
    sheetName: "Εισπράξεις",
    title: `Εισπράξεις — ${ctx.businessName}`,
  });
  return xlsxResponse(buf, `timologion-payments-${today}.xlsx`);
}
