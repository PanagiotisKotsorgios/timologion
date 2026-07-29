import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { toCsv, csvResponse } from "@/lib/csv";
import { toXlsxBuffer, xlsxResponse, type XlsxColumn } from "@/lib/xlsx";
import { toPdfBuffer, pdfResponse, type PdfColumn } from "@/lib/pdf/table-pdf";

type Row = Awaited<ReturnType<typeof loadRows>>[number];

async function loadRows(businessId: string) {
  return prisma.item.findMany({
    where: { businessId },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    take: 5000,
  });
}

const kindLabel = (k: string) => (k === "product" ? "Προϊόν" : "Υπηρεσία");

export async function GET(req: Request) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "item:read");

  const format = (new URL(req.url).searchParams.get("format") ?? "xlsx").toLowerCase();
  const rows = await loadRows(ctx.businessId);
  const today = new Date().toISOString().slice(0, 10);

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "export.items",
    meta: { rows: rows.length, format },
  });

  if (format === "csv") {
    const csv = toCsv(rows, [
      { header: "Τύπος", value: (i) => kindLabel(i.kind) },
      { header: "Κωδικός", value: (i) => i.code ?? "" },
      { header: "Ονομασία", value: (i) => i.name },
      { header: "Μονάδα", value: (i) => i.unit },
      { header: "Τιμή", value: (i) => i.defaultPrice.toString() },
      { header: "ΦΠΑ %", value: (i) => i.vatRate.toString() },
      { header: "Κατηγορία ΦΠΑ", value: (i) => i.vatCategory ?? "" },
      { header: "Περιγραφή", value: (i) => i.description ?? "" },
      { header: "Ενεργό", value: (i) => (i.active ? "Ναι" : "Όχι") },
    ]);
    return csvResponse(csv, `timologion-items-${today}.csv`);
  }

  if (format === "pdf") {
    const cols: PdfColumn<Row>[] = [
      { header: "Τύπος", value: (i) => kindLabel(i.kind), weight: 1 },
      { header: "Κωδικός", value: (i) => i.code ?? "", weight: 1 },
      { header: "Ονομασία", value: (i) => i.name, weight: 3 },
      { header: "Μονάδα", value: (i) => i.unit, weight: 0.7 },
      { header: "Τιμή", value: (i) => i.defaultPrice, format: "money", align: "right", weight: 1 },
      { header: "ΦΠΑ %", value: (i) => Number(i.vatRate), format: "number", align: "right", weight: 0.7 },
      { header: "Ενεργό", value: (i) => (i.active ? "Ναι" : "Όχι"), weight: 0.6 },
    ];
    const buf = await toPdfBuffer({
      title: "Είδη / Υπηρεσίες",
      subtitle: ctx.businessName,
      meta: [
        { label: "Πλήθος", value: String(rows.length) },
        { label: "Εξαγωγή", value: new Date().toLocaleDateString("el-GR") },
      ],
      rows,
      columns: cols,
      footerNote: "Παραγωγή: timologion.gr",
    });
    return pdfResponse(buf, `timologion-items-${today}.pdf`);
  }

  const cols: XlsxColumn<Row>[] = [
    { header: "Τύπος", value: (i) => kindLabel(i.kind), width: 12 },
    { header: "Κωδικός", value: (i) => i.code ?? "", width: 14 },
    { header: "Ονομασία", value: (i) => i.name, width: 40 },
    { header: "Μονάδα", value: (i) => i.unit, width: 10 },
    { header: "Τιμή", value: (i) => i.defaultPrice, format: "€#,##0.00", width: 12 },
    { header: "ΦΠΑ %", value: (i) => Number(i.vatRate), format: "0.00", width: 10 },
    { header: "Κατηγορία ΦΠΑ", value: (i) => i.vatCategory ?? "", width: 16 },
    { header: "Περιγραφή", value: (i) => i.description ?? "", width: 40 },
    { header: "Ενεργό", value: (i) => (i.active ? "Ναι" : "Όχι"), width: 10 },
  ];
  const buf = await toXlsxBuffer(rows, cols, {
    sheetName: "Είδη",
    title: `Είδη / Υπηρεσίες — ${ctx.businessName}`,
  });
  return xlsxResponse(buf, `timologion-items-${today}.xlsx`);
}
