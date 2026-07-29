import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import ExcelJS from "exceljs";
import {
  toMultiSectionPdfBuffer,
  pdfResponse,
  type PdfColumn,
  type PdfSection,
} from "@/lib/pdf/table-pdf";
import { t } from "@/lib/i18n";

const METHOD_LABEL: Record<string, string> = {
  cash: "Μετρητά",
  card: "Κάρτα",
  bank_transfer: "Τραπεζική",
  iris: "IRIS",
  check: "Επιταγή",
  credit: "Επί πιστώσει",
  other: "Άλλο",
};
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  unpaid: "Ανεξόφλητο",
  partial: "Μερικώς",
  paid: "Εξοφλημένο",
};

/**
 * Per-client aggregated export: bundles the client's contact card, every
 * παραστατικό they've been billed, and every πληρωμή they've made — as
 * either a multi-sheet XLSX or a multi-page PDF. Answers "give me
 * everything about this customer" without stitching several downloads
 * together.
 *
 * Format: ?format=xlsx (default) | pdf
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:read");

  const { id } = await params;
  const format = (new URL(req.url).searchParams.get("format") ?? "xlsx").toLowerCase();

  const client = await prisma.client.findFirst({
    where: { id, businessId: ctx.businessId },
  });
  if (!client) {
    return new Response("Not found", { status: 404 });
  }

  const [documents, payments] = await Promise.all([
    prisma.document.findMany({
      where: { businessId: ctx.businessId, clientId: id },
      orderBy: { issueDate: "desc" },
    }),
    prisma.payment.findMany({
      where: { businessId: ctx.businessId, clientId: id },
      orderBy: { receivedAt: "desc" },
      include: {
        document: { select: { series: true, number: true } },
      },
    }),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const filenameBase = `timologion-client-${slug(client.legalName)}-${today}`;

  await logAudit({
    userId: ctx.userId,
    businessId: ctx.businessId,
    action: "export.client_bundle",
    entityType: "Client",
    entityId: id,
    meta: { format, docs: documents.length, payments: payments.length },
  });

  if (format === "pdf") {
    return exportPdf({
      client,
      documents,
      payments,
      businessName: ctx.businessName,
      filename: `${filenameBase}.pdf`,
    });
  }

  return exportXlsx({
    client,
    documents,
    payments,
    businessName: ctx.businessName,
    filename: `${filenameBase}.xlsx`,
  });
}

function slug(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 40) || "client";
}

type ClientRow = Awaited<ReturnType<typeof prisma.client.findFirst>>;
type DocRow = Awaited<ReturnType<typeof prisma.document.findMany>>[number];
type PayRow = Awaited<
  ReturnType<
    typeof prisma.payment.findMany<{
      include: { document: { select: { series: true; number: true } } };
    }>
  >
>[number];

async function exportXlsx(input: {
  client: NonNullable<ClientRow>;
  documents: DocRow[];
  payments: PayRow[];
  businessName: string;
  filename: string;
}): Promise<Response> {
  const { client, documents, payments, businessName, filename } = input;
  const wb = new ExcelJS.Workbook();
  wb.creator = "timologion.gr";
  wb.created = new Date();

  // ─── Sheet 1: Στοιχεία πελάτη ─────────────────────────────────────────
  const info = wb.addWorksheet("Στοιχεία πελάτη");
  info.getColumn(1).width = 26;
  info.getColumn(2).width = 60;
  info.mergeCells("A1:B1");
  info.getCell("A1").value = `${client.legalName} — καρτέλα από ${businessName}`;
  info.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF0F1F39" } };
  info.getRow(1).height = 26;
  info.addRow(["Πεδίο", "Τιμή"]);
  styleHeader(info.getRow(2));
  const pairs: [string, string][] = [
    ["Επωνυμία", client.legalName],
    ["Διακριτικός τίτλος", client.tradeName ?? ""],
    ["ΑΦΜ", client.vatNumber ?? ""],
    ["ΔΟΥ", client.taxOffice ?? ""],
    ["Δραστηριότητα", client.activity ?? ""],
    ["Διεύθυνση", client.addressLine ?? ""],
    ["Πόλη", client.city ?? ""],
    ["Τ.Κ.", client.postalCode ?? ""],
    ["Χώρα", client.country ?? ""],
    ["Email", client.email ?? ""],
    ["Τηλέφωνο", client.phone ?? ""],
    ["Σημειώσεις", client.notes ?? ""],
    ["Ημερομηνία δημιουργίας", client.createdAt.toISOString().slice(0, 10)],
    ["Πλήθος παραστατικών", String(documents.length)],
    ["Πλήθος εισπράξεων", String(payments.length)],
    [
      "Συνολική τζιρολόγηση",
      `${documents.reduce((s, d) => s + Number(d.totalAmount), 0).toFixed(2)} €`,
    ],
    [
      "Συνολικές εισπράξεις",
      `${payments.reduce((s, p) => s + Number(p.amount), 0).toFixed(2)} €`,
    ],
  ];
  pairs.forEach(([k, v]) => info.addRow([k, v]));
  for (let r = 3; r <= info.rowCount; r++) {
    info.getRow(r).getCell(1).font = { bold: true };
  }

  // ─── Sheet 2: Παραστατικά ─────────────────────────────────────────────
  const docs = wb.addWorksheet("Παραστατικά");
  docs.columns = [
    { header: "Ημερομηνία", width: 12 },
    { header: "Τύπος", width: 26 },
    { header: "Σειρά", width: 8 },
    { header: "Αριθμός", width: 10 },
    { header: "Καθαρή αξία", width: 14 },
    { header: "ΦΠΑ", width: 12 },
    { header: "Σύνολο", width: 14 },
    { header: "Κατάσταση", width: 12 },
    { header: "Πληρωμή", width: 14 },
    { header: "MARK", width: 20 },
    { header: "Μέθοδος πληρωμής", width: 18 },
  ];
  styleHeader(docs.getRow(1));
  for (const d of documents) {
    docs.addRow([
      d.issueDate,
      t.documents.types[d.type],
      d.series ?? "",
      d.number ?? "",
      Number(d.netTotalAmount),
      Number(d.vatTotalAmount),
      Number(d.totalAmount),
      d.status,
      PAYMENT_STATUS_LABEL[d.paymentStatus] ?? d.paymentStatus,
      d.myDataMark ?? "",
      d.paymentMethod ?? "",
    ]);
  }
  applyMoney(docs, [5, 6, 7]);
  applyDate(docs, [1]);
  applyZebra(docs);
  docs.views = [{ state: "frozen", ySplit: 1 }];

  // ─── Sheet 3: Πληρωμές ────────────────────────────────────────────────
  const pays = wb.addWorksheet("Εισπράξεις");
  pays.columns = [
    { header: "Ημερομηνία", width: 12 },
    { header: "Παραστατικό", width: 16 },
    { header: "Ποσό", width: 12 },
    { header: "Μέθοδος", width: 14 },
    { header: "Αναφορά", width: 20 },
    { header: "Σημειώσεις", width: 32 },
  ];
  styleHeader(pays.getRow(1));
  for (const p of payments) {
    const docLabel = p.document
      ? `${p.document.series ?? ""}${p.document.number ? " #" + p.document.number : ""}`
      : "";
    pays.addRow([
      p.receivedAt,
      docLabel,
      Number(p.amount),
      METHOD_LABEL[p.method] ?? p.method,
      p.reference ?? "",
      p.notes ?? "",
    ]);
  }
  applyMoney(pays, [3]);
  applyDate(pays, [1]);
  applyZebra(pays);
  pays.views = [{ state: "frozen", ySplit: 1 }];

  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

async function exportPdf(input: {
  client: NonNullable<ClientRow>;
  documents: DocRow[];
  payments: PayRow[];
  businessName: string;
  filename: string;
}): Promise<Response> {
  const { client, documents, payments, businessName, filename } = input;

  const totalBilled = documents.reduce((s, d) => s + Number(d.totalAmount), 0);
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const generated = new Date().toLocaleDateString("el-GR");

  const clientMeta = [
    { label: "Επωνυμία", value: client.legalName },
    { label: "ΑΦΜ", value: client.vatNumber ?? "—" },
    { label: "ΔΟΥ", value: client.taxOffice ?? "—" },
    { label: "Πόλη", value: client.city ?? "—" },
    { label: "Τηλέφωνο", value: client.phone ?? "—" },
    { label: "Email", value: client.email ?? "—" },
  ];

  const summaryMeta = [
    { label: "Παραστατικά", value: String(documents.length) },
    { label: "Τζιρολόγηση", value: `${totalBilled.toFixed(2)} €` },
    { label: "Εισπράξεις", value: `${totalPaid.toFixed(2)} €` },
    { label: "Υπόλοιπο", value: `${(totalBilled - totalPaid).toFixed(2)} €` },
  ];

  const docCols: PdfColumn<DocRow>[] = [
    { header: "Ημ/νία", value: (d) => d.issueDate, format: "date", weight: 1 },
    { header: "Τύπος", value: (d) => t.documents.types[d.type], weight: 1.8 },
    { header: "Σειρά", value: (d) => d.series ?? "", weight: 0.6 },
    { header: "Αρ.", value: (d) => d.number ?? "", weight: 0.6, align: "right" },
    { header: "Καθαρή", value: (d) => d.netTotalAmount, format: "money", align: "right", weight: 1 },
    { header: "ΦΠΑ", value: (d) => d.vatTotalAmount, format: "money", align: "right", weight: 0.9 },
    { header: "Σύνολο", value: (d) => d.totalAmount, format: "money", align: "right", weight: 1 },
    { header: "Κατάσταση", value: (d) => d.status, weight: 1 },
    {
      header: "Πληρωμή",
      value: (d) => PAYMENT_STATUS_LABEL[d.paymentStatus] ?? d.paymentStatus,
      weight: 1,
    },
  ];

  const payCols: PdfColumn<PayRow>[] = [
    { header: "Ημ/νία", value: (p) => p.receivedAt, format: "date", weight: 1 },
    {
      header: "Παραστατικό",
      value: (p) =>
        p.document
          ? `${p.document.series ?? ""}${p.document.number ? " #" + p.document.number : ""}`
          : "",
      weight: 1.4,
    },
    { header: "Ποσό", value: (p) => p.amount, format: "money", align: "right", weight: 1 },
    { header: "Μέθοδος", value: (p) => METHOD_LABEL[p.method] ?? p.method, weight: 1.2 },
    { header: "Αναφορά", value: (p) => p.reference ?? "", weight: 1.6 },
    { header: "Σημειώσεις", value: (p) => p.notes ?? "", weight: 2 },
  ];

  const sections: PdfSection[] = [
    {
      title: `Παραστατικά — ${client.legalName}`,
      subtitle: `${businessName} · ${generated}`,
      meta: [...clientMeta, ...summaryMeta],
      rows: documents,
      columns: docCols,
      footerNote: "Παραγωγή: timologion.gr",
    },
  ];

  if (payments.length > 0) {
    sections.push({
      title: `Εισπράξεις — ${client.legalName}`,
      subtitle: `${businessName} · ${generated}`,
      meta: [
        { label: "Πλήθος εισπράξεων", value: String(payments.length) },
        { label: "Συνολικές εισπράξεις", value: `${totalPaid.toFixed(2)} €` },
        { label: "Υπόλοιπο", value: `${(totalBilled - totalPaid).toFixed(2)} €` },
      ],
      rows: payments,
      columns: payCols,
      footerNote: "Παραγωγή: timologion.gr",
    });
  }

  const buf = await toMultiSectionPdfBuffer({
    documentTitle: `Καρτέλα πελάτη — ${client.legalName}`,
    sections,
  });
  return pdfResponse(buf, filename);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function styleHeader(row: any) {
  row.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  row.alignment = { vertical: "middle", horizontal: "left" };
  row.height = 22;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row.eachCell((cell: any) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F1F39" } };
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyMoney(ws: any, columnIndexes: number[]) {
  for (const c of columnIndexes) {
    ws.getColumn(c).numFmt = "€#,##0.00";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyDate(ws: any, columnIndexes: number[]) {
  for (const c of columnIndexes) {
    ws.getColumn(c).numFmt = "yyyy-mm-dd";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyZebra(ws: any) {
  const rowCount = ws.rowCount;
  for (let r = 2; r <= rowCount; r++) {
    if ((r - 1) % 2 === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ws.getRow(r).eachCell((cell: any) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F7FB" } };
      });
    }
  }
}
