import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { toCsv, csvResponse } from "@/lib/csv";
import { toXlsxBuffer, xlsxResponse, type XlsxColumn } from "@/lib/xlsx";
import { toPdfBuffer, pdfResponse, type PdfColumn } from "@/lib/pdf/table-pdf";
import { expenseMyDataCode } from "@/lib/expense-mydata-types";

const STATUS_LABEL: Record<string, string> = {
  unpaid: "Ανεξόφλητο",
  partial: "Μερικώς",
  paid: "Εξοφλημένο",
};

type Row = Awaited<ReturnType<typeof loadRows>>[number];

async function loadRows(businessId: string) {
  return prisma.expense.findMany({
    where: { businessId },
    orderBy: { issueDate: "desc" },
    take: 10000,
    include: {
      supplier: { select: { legalName: true, vatNumber: true } },
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
    action: "export.expenses",
    meta: { rows: rows.length, format },
  });

  if (format === "csv") {
    const csv = toCsv(rows, [
      { header: "Ημερομηνία", value: (e) => e.issueDate },
      { header: "Προμηθευτής", value: (e) => e.supplier?.legalName ?? "" },
      { header: "ΑΦΜ", value: (e) => e.supplier?.vatNumber ?? "" },
      { header: "Παραστατικό", value: (e) => e.reference ?? "" },
      { header: "Κατηγορία", value: (e) => e.category ?? "" },
      { header: "myDATA", value: (e) => expenseMyDataCode(e.myDataType) ?? "" },
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
    return csvResponse(csv, `timologion-expenses-${today}.csv`);
  }

  if (format === "pdf") {
    const cols: PdfColumn<Row>[] = [
      { header: "Ημ/νία", value: (e) => e.issueDate, format: "date", weight: 1 },
      { header: "Προμηθευτής", value: (e) => e.supplier?.legalName ?? "", weight: 2 },
      { header: "ΑΦΜ", value: (e) => e.supplier?.vatNumber ?? "", weight: 1 },
      { header: "Παραστατικό", value: (e) => e.reference ?? "", weight: 1.2 },
      { header: "Κατηγορία", value: (e) => e.category ?? "", weight: 1.2 },
      { header: "myDATA", value: (e) => expenseMyDataCode(e.myDataType) ?? "", weight: 0.8 },
      { header: "Καθαρή", value: (e) => e.netAmount, format: "money", align: "right", weight: 1 },
      { header: "ΦΠΑ", value: (e) => e.vatAmount, format: "money", align: "right", weight: 0.9 },
      { header: "Σύνολο", value: (e) => e.totalAmount, format: "money", align: "right", weight: 1 },
      {
        header: "Κατάσταση",
        value: (e) => STATUS_LABEL[e.paymentStatus] ?? e.paymentStatus,
        weight: 1,
      },
    ];
    const total = rows.reduce((s, e) => s + Number(e.totalAmount), 0);
    const buf = await toPdfBuffer({
      title: "Έξοδα",
      subtitle: ctx.businessName,
      meta: [
        { label: "Εγγραφές", value: String(rows.length) },
        { label: "Συνολικό ποσό", value: `${total.toFixed(2)} €` },
        { label: "Εξαγωγή", value: new Date().toLocaleDateString("el-GR") },
      ],
      rows,
      columns: cols,
      footerNote: "Παραγωγή: timologion.gr",
    });
    return pdfResponse(buf, `timologion-expenses-${today}.pdf`);
  }

  const cols: XlsxColumn<Row>[] = [
    { header: "Ημερομηνία", value: (e) => e.issueDate, format: "yyyy-mm-dd", width: 12 },
    { header: "Προμηθευτής", value: (e) => e.supplier?.legalName ?? "", width: 30 },
    { header: "ΑΦΜ", value: (e) => e.supplier?.vatNumber ?? "", width: 12 },
    { header: "Παραστατικό", value: (e) => e.reference ?? "", width: 18 },
    { header: "Κατηγορία", value: (e) => e.category ?? "", width: 18 },
    { header: "myDATA", value: (e) => expenseMyDataCode(e.myDataType) ?? "", width: 10 },
    { header: "Περιγραφή", value: (e) => e.description ?? "", width: 32 },
    { header: "Καθαρή αξία", value: (e) => e.netAmount, format: "€#,##0.00", width: 14 },
    { header: "ΦΠΑ %", value: (e) => Number(e.vatRate), format: "0.00", width: 10 },
    { header: "ΦΠΑ αξία", value: (e) => e.vatAmount, format: "€#,##0.00", width: 12 },
    { header: "Σύνολο", value: (e) => e.totalAmount, format: "€#,##0.00", width: 14 },
    { header: "Πληρώθηκε", value: (e) => e.paidAmount, format: "€#,##0.00", width: 12 },
    {
      header: "Κατάσταση πληρωμής",
      value: (e) => STATUS_LABEL[e.paymentStatus] ?? e.paymentStatus,
      width: 18,
    },
    { header: "Σημειώσεις", value: (e) => e.notes ?? "", width: 32 },
  ];
  const buf = await toXlsxBuffer(rows, cols, {
    sheetName: "Έξοδα",
    title: `Έξοδα — ${ctx.businessName}`,
  });
  return xlsxResponse(buf, `timologion-expenses-${today}.xlsx`);
}
