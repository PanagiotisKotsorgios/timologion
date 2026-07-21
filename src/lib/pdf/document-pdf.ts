import path from "node:path";
import PDFDocument from "pdfkit";
import type { Prisma } from "@prisma/client";

type Numeric = number | string | Prisma.Decimal;

const FONTS_DIR = path.join(process.cwd(), "public", "fonts");
const FONT_REGULAR = path.join(FONTS_DIR, "NotoSans-Regular.ttf");
const FONT_BOLD = path.join(FONTS_DIR, "NotoSans-Bold.ttf");

const nfCurrency = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});
const nfDate = new Intl.DateTimeFormat("el-GR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function toNumber(v: Numeric): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  return Number(v.toString());
}
function money(v: Numeric): string {
  return nfCurrency.format(toNumber(v));
}
function fdate(v: Date): string {
  return nfDate.format(v);
}

const DOC_TYPE_LABEL: Record<string, string> = {
  invoice: "ΤΙΜΟΛΟΓΙΟ ΠΩΛΗΣΗΣ",
  service_invoice: "ΤΙΜΟΛΟΓΙΟ ΠΑΡΟΧΗΣ ΥΠΗΡΕΣΙΩΝ",
  retail_receipt: "ΑΠΟΔΕΙΞΗ ΛΙΑΝΙΚΗΣ",
  service_receipt: "ΑΠΟΔΕΙΞΗ ΠΑΡΟΧΗΣ ΥΠΗΡΕΣΙΩΝ",
  credit_note: "ΠΙΣΤΩΤΙΚΟ",
  proforma: "ΠΡΟΤΙΜΟΛΟΓΙΟ",
  quote: "ΠΡΟΣΦΟΡΑ",
  order: "ΠΑΡΑΓΓΕΛΙΑ",
  delivery_note: "ΔΕΛΤΙΟ ΑΠΟΣΤΟΛΗΣ",
};

export type DocumentPdfInput = {
  business: {
    legalName: string;
    tradeName?: string | null;
    vatNumber: string;
    taxOffice?: string | null;
    activity?: string | null;
    addressLine?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string;
    phone?: string | null;
    email?: string | null;
  };
  client?: {
    legalName: string;
    tradeName?: string | null;
    vatNumber?: string | null;
    taxOffice?: string | null;
    addressLine?: string | null;
    city?: string | null;
    postalCode?: string | null;
    email?: string | null;
    activity?: string | null;
  } | null;
  doc: {
    type: string;
    status: string;
    series?: string | null;
    number?: number | null;
    issueDate: Date;
    paymentMethod?: string | null;
    notes?: string | null;
    netTotalAmount: Numeric;
    vatTotalAmount: Numeric;
    totalAmount: Numeric;
    myDataMark?: string | null;
    myDataUid?: string | null;
    myDataQrUrl?: string | null;
    wrappInvoiceUrl?: string | null;
  };
  lines: Array<{
    description: string;
    quantity: Numeric;
    unit: string;
    unitPrice: Numeric;
    vatRate: Numeric;
    totalAmount: Numeric;
  }>;
};

export function buildDocumentPdf(data: DocumentPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 40, bottom: 60, left: 40, right: 40 },
        info: {
          Title: `${data.doc.series ?? ""}${data.doc.number ? " #" + data.doc.number : ""}`,
          Author: data.business.legalName,
        },
      });

      doc.registerFont("body", FONT_REGULAR);
      doc.registerFont("bold", FONT_BOLD);
      doc.font("body");

      const buffers: Buffer[] = [];
      doc.on("data", (b) => buffers.push(b as Buffer));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      render(doc, data);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function render(doc: any, data: DocumentPdfInput) {
  const { business, client, lines } = data;
  const d = data.doc;
  const pageW = doc.page.width;
  const left = doc.page.margins.left;
  const right = pageW - doc.page.margins.right;
  const contentW = right - left;

  // ─── Header band ──────────────────────────────────────────────
  const headerTop = 40;
  doc.rect(left, headerTop, contentW, 90).fill("#0B1B3A");

  doc
    .fillColor("#FFFFFF")
    .font("bold")
    .fontSize(20)
    .text(business.legalName, left + 20, headerTop + 16, {
      width: contentW / 2 - 40,
    });
  doc
    .font("body")
    .fontSize(9)
    .fillColor("#C7D2FE")
    .text(business.tradeName ?? "", { width: contentW / 2 - 40 });

  const lineParts: string[] = [];
  if (business.addressLine) lineParts.push(business.addressLine);
  if (business.postalCode || business.city)
    lineParts.push(`${business.postalCode ?? ""} ${business.city ?? ""}`.trim());
  doc
    .fillColor("#E5E7EB")
    .text(lineParts.join(" · "), { width: contentW / 2 - 40 });
  doc.text(
    `ΑΦΜ ${business.vatNumber}${business.taxOffice ? ` · ${business.taxOffice}` : ""}`,
    { width: contentW / 2 - 40 },
  );
  if (business.phone || business.email) {
    doc.text(
      [business.phone, business.email].filter(Boolean).join(" · "),
      { width: contentW / 2 - 40 },
    );
  }

  // Document title box (right)
  const titleBoxW = 220;
  const titleBoxX = right - titleBoxW - 20;
  doc.rect(titleBoxX, headerTop + 14, titleBoxW, 62).fill("#FFFFFF");
  doc
    .fillColor("#0B1B3A")
    .font("bold")
    .fontSize(13)
    .text(DOC_TYPE_LABEL[d.type] ?? d.type, titleBoxX + 12, headerTop + 22, {
      width: titleBoxW - 24,
      align: "center",
    });
  doc
    .font("body")
    .fontSize(10)
    .fillColor("#4B5563")
    .text(
      `${d.series ?? ""}${d.number ? " #" + d.number : ""}`,
      titleBoxX + 12,
      headerTop + 42,
      { width: titleBoxW - 24, align: "center" },
    );
  doc
    .font("bold")
    .fontSize(11)
    .fillColor("#0B1B3A")
    .text(fdate(d.issueDate), titleBoxX + 12, headerTop + 56, {
      width: titleBoxW - 24,
      align: "center",
    });

  // ─── Parties ──────────────────────────────────────────────────
  const partiesTop = headerTop + 110;
  const boxW = (contentW - 20) / 2;

  drawPartyBox(
    doc,
    left,
    partiesTop,
    boxW,
    "ΕΚΔΟΤΗΣ",
    [
      business.legalName,
      business.tradeName ?? "",
      business.activity ?? "",
      [business.addressLine, business.postalCode, business.city]
        .filter(Boolean)
        .join(", "),
      `ΑΦΜ: ${business.vatNumber}`,
      business.taxOffice ? `ΔΟΥ: ${business.taxOffice}` : "",
    ].filter(Boolean),
  );

  if (client) {
    drawPartyBox(
      doc,
      left + boxW + 20,
      partiesTop,
      boxW,
      "ΛΗΠΤΗΣ",
      [
        client.legalName,
        client.tradeName ?? "",
        client.activity ?? "",
        [client.addressLine, client.postalCode, client.city]
          .filter(Boolean)
          .join(", "),
        client.vatNumber ? `ΑΦΜ: ${client.vatNumber}` : "",
        client.taxOffice ? `ΔΟΥ: ${client.taxOffice}` : "",
      ].filter(Boolean),
    );
  } else {
    drawPartyBox(doc, left + boxW + 20, partiesTop, boxW, "ΛΗΠΤΗΣ", [
      "Λιανική / Χωρίς πελάτη",
    ]);
  }

  // ─── Lines table ──────────────────────────────────────────────
  const tableTop = partiesTop + 130;
  const COL_DESC = { label: "ΠΕΡΙΓΡΑΦΗ", w: 240, align: "left" as const };
  const COL_QTY = { label: "ΠΟΣΟΤ.", w: 60, align: "right" as const };
  const COL_UNIT = { label: "ΜΟΝ.", w: 45, align: "center" as const };
  const COL_PRICE = { label: "ΤΙΜΗ", w: 70, align: "right" as const };
  const COL_VAT = { label: "ΦΠΑ", w: 45, align: "right" as const };
  const COL_TOTAL = { label: "ΣΥΝΟΛΟ", w: 55, align: "right" as const };
  const cols = [COL_DESC, COL_QTY, COL_UNIT, COL_PRICE, COL_VAT, COL_TOTAL];

  // Header row
  doc.rect(left, tableTop, contentW, 22).fill("#F3F4F6");
  doc.fillColor("#0B1B3A").font("bold").fontSize(9);
  let x = left + 6;
  for (const c of cols) {
    doc.text(c.label, x, tableTop + 7, {
      width: c.w - 4,
      align: c.align,
    });
    x += c.w;
  }

  // Body rows
  doc.font("body").fontSize(9.5).fillColor("#111827");
  let y = tableTop + 22;
  for (const line of lines) {
    const descHeight = doc.heightOfString(line.description, {
      width: COL_DESC.w - 8,
    });
    const rowH = Math.max(20, descHeight + 8);

    if (y + rowH > doc.page.height - 140) {
      doc.addPage();
      y = 60;
    }

    doc
      .strokeColor("#E5E7EB")
      .moveTo(left, y + rowH)
      .lineTo(right, y + rowH)
      .stroke();

    x = left + 6;
    doc.text(line.description, x, y + 5, { width: COL_DESC.w - 8, align: "left" });
    x += COL_DESC.w;
    doc.text(String(toNumber(line.quantity)), x, y + 5, {
      width: COL_QTY.w - 4,
      align: "right",
    });
    x += COL_QTY.w;
    doc.text(line.unit, x, y + 5, { width: COL_UNIT.w - 4, align: "center" });
    x += COL_UNIT.w;
    doc.text(money(line.unitPrice), x, y + 5, {
      width: COL_PRICE.w - 4,
      align: "right",
    });
    x += COL_PRICE.w;
    doc.text(`${toNumber(line.vatRate)}%`, x, y + 5, {
      width: COL_VAT.w - 4,
      align: "right",
    });
    x += COL_VAT.w;
    doc
      .font("bold")
      .text(money(line.totalAmount), x, y + 5, {
        width: COL_TOTAL.w - 4,
        align: "right",
      })
      .font("body");

    y += rowH;
  }

  // ─── Totals ───────────────────────────────────────────────────
  const totalsTop = y + 16;
  const totalsW = 240;
  const totalsX = right - totalsW;

  drawTotalRow(doc, totalsX, totalsTop, totalsW, "Καθαρή αξία", money(d.netTotalAmount));
  drawTotalRow(doc, totalsX, totalsTop + 20, totalsW, "ΦΠΑ", money(d.vatTotalAmount));

  doc.rect(totalsX, totalsTop + 44, totalsW, 32).fill("#0B1B3A");
  doc
    .fillColor("#FFFFFF")
    .font("bold")
    .fontSize(11)
    .text("ΣΥΝΟΛΟ", totalsX + 12, totalsTop + 54, { width: 100 });
  doc
    .fontSize(14)
    .text(money(d.totalAmount), totalsX, totalsTop + 51, {
      width: totalsW - 12,
      align: "right",
    });

  // ─── Notes ────────────────────────────────────────────────────
  if (d.notes) {
    const notesTop = totalsTop + 96;
    doc
      .fillColor("#6B7280")
      .font("bold")
      .fontSize(9)
      .text("ΣΗΜΕΙΩΣΕΙΣ", left, notesTop);
    doc
      .fillColor("#111827")
      .font("body")
      .fontSize(9.5)
      .text(d.notes, left, notesTop + 14, { width: contentW - totalsW - 20 });
  }

  // ─── myDATA footer ────────────────────────────────────────────
  const footerTop = doc.page.height - 80;
  doc
    .strokeColor("#E5E7EB")
    .moveTo(left, footerTop)
    .lineTo(right, footerTop)
    .stroke();

  doc
    .fillColor("#6B7280")
    .font("body")
    .fontSize(8)
    .text(
      "Ηλεκτρονική έκδοση μέσω timologion — Πάροχος ηλεκτρονικής τιμολόγησης myDATA",
      left,
      footerTop + 10,
      { width: contentW, align: "center" },
    );

  if (d.myDataMark) {
    doc
      .fillColor("#111827")
      .font("bold")
      .fontSize(9)
      .text(`ΜΑΡΚ myDATA: ${d.myDataMark}`, left, footerTop + 26, {
        width: contentW,
        align: "center",
      });
  }

  if (d.paymentMethod) {
    doc
      .fillColor("#6B7280")
      .font("body")
      .fontSize(8)
      .text(`Μέθοδος πληρωμής: ${d.paymentMethod}`, left, footerTop + 42, {
        width: contentW,
        align: "center",
      });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawPartyBox(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  x: number,
  y: number,
  w: number,
  title: string,
  lines: string[],
) {
  doc.roundedRect(x, y, w, 120, 4).fillAndStroke("#F9FAFB", "#E5E7EB");
  doc
    .fillColor("#6B7280")
    .font("bold")
    .fontSize(8)
    .text(title, x + 12, y + 10, { width: w - 24, characterSpacing: 1 });
  doc.fillColor("#111827").font("body").fontSize(10);
  let yy = y + 26;
  for (const l of lines) {
    if (!l) continue;
    const h = doc.heightOfString(l, { width: w - 24 });
    doc.text(l, x + 12, yy, { width: w - 24 });
    yy += h + 2;
    if (yy > y + 110) break;
  }
}

function drawTotalRow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  x: number,
  y: number,
  w: number,
  label: string,
  value: string,
) {
  doc
    .fillColor("#6B7280")
    .font("body")
    .fontSize(10)
    .text(label, x + 12, y + 4, { width: 120 });
  doc
    .fillColor("#111827")
    .font("bold")
    .text(value, x, y + 4, { width: w - 12, align: "right" });
}
