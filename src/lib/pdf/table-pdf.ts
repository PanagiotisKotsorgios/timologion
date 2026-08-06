import "server-only";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { Prisma } from "@prisma/client";

const FONTS_DIR = path.join(process.cwd(), "public", "fonts");
const FONT_REGULAR = path.join(FONTS_DIR, "NotoSans-Regular.ttf");
const FONT_BOLD = path.join(FONTS_DIR, "NotoSans-Bold.ttf");

export type PdfCellValue =
  | string
  | number
  | boolean
  | Date
  | Prisma.Decimal
  | null
  | undefined;

export type PdfColumn<T> = {
  header: string;
  value: (row: T) => PdfCellValue;
  /** Relative weight for column width. Column width = totalWidth * weight / sum(weights). */
  weight?: number;
  align?: "left" | "right" | "center";
  format?: "money" | "date" | "datetime" | "number";
};

export type PdfTableInput<T> = {
  title: string;
  subtitle?: string;
  meta?: { label: string; value: string }[];
  rows: T[];
  columns: PdfColumn<T>[];
  footerNote?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PdfSection = {
  title: string;
  subtitle?: string;
  meta?: { label: string; value: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: PdfColumn<any>[];
  footerNote?: string;
};

export type PdfMultiInput = {
  documentTitle: string;
  sections: PdfSection[];
};

const nfMoney = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});
const nfDate = new Intl.DateTimeFormat("el-GR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const nfDateTime = new Intl.DateTimeFormat("el-GR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatCell<T>(col: PdfColumn<T>, raw: PdfCellValue): string {
  if (raw == null) return "";
  const isDecimal =
    typeof raw === "object" && "toNumber" in raw && typeof raw.toNumber === "function";
  switch (col.format) {
    case "money": {
      const n = isDecimal ? (raw as Prisma.Decimal).toNumber() : Number(raw);
      return Number.isFinite(n) ? nfMoney.format(n) : "";
    }
    case "date":
      return raw instanceof Date ? nfDate.format(raw) : String(raw);
    case "datetime":
      return raw instanceof Date ? nfDateTime.format(raw) : String(raw);
    case "number": {
      const n = isDecimal ? (raw as Prisma.Decimal).toNumber() : Number(raw);
      return Number.isFinite(n) ? n.toLocaleString("el-GR") : "";
    }
    default:
      if (raw instanceof Date) return nfDate.format(raw);
      if (isDecimal) return (raw as Prisma.Decimal).toString();
      return String(raw);
  }
}

/**
 * Render a table of rows to a PDF buffer. Handles A4 landscape layout,
 * page breaks, zebra striping, and a title / meta header. Uses the same
 * NotoSans Greek font as the invoice PDF.
 */
export async function toPdfBuffer<T>(input: PdfTableInput<T>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margins: { top: 40, bottom: 60, left: 32, right: 32 },
        info: { Title: input.title, Author: "timologion.gr" },
      });
      doc.registerFont("body", FONT_REGULAR);
      doc.registerFont("bold", FONT_BOLD);
      doc.font("body");

      const buffers: Buffer[] = [];
      doc.on("data", (b) => buffers.push(b as Buffer));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      render(doc, input);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function render<T>(doc: any, input: PdfTableInput<T>) {
  const { title, subtitle, meta, rows, columns, footerNote } = input;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Header
  doc.font("bold").fontSize(16).fillColor("#0F1F39").text(title, { align: "left" });
  if (subtitle) {
    doc.moveDown(0.2).font("body").fontSize(10).fillColor("#4A5568").text(subtitle);
  }

  if (meta && meta.length) {
    doc.moveDown(0.4);
    doc.font("body").fontSize(9).fillColor("#0F1F39");
    for (const m of meta) {
      doc.text(`${m.label}: `, { continued: true }).font("bold").text(m.value).font("body");
    }
  }

  doc.moveDown(0.6);

  // Column widths
  const weightSum = columns.reduce((s, c) => s + (c.weight ?? 1), 0);
  const widths = columns.map((c) => (pageWidth * (c.weight ?? 1)) / weightSum);
  const rowHeight = 20;
  const cellPad = 4;

  const bodyStartY = doc.y;

  function drawHeader(y: number) {
    doc.rect(doc.page.margins.left, y, pageWidth, rowHeight).fill("#0F1F39");
    doc.fillColor("#FFFFFF").font("bold").fontSize(9);
    let x = doc.page.margins.left;
    for (let i = 0; i < columns.length; i++) {
      doc.text(columns[i]!.header, x + cellPad, y + 5, {
        width: widths[i]! - cellPad * 2,
        align: columns[i]!.align ?? "left",
        lineBreak: false,
      });
      x += widths[i]!;
    }
    doc.fillColor("#0F1F39").font("body");
  }

  drawHeader(bodyStartY);
  let y = bodyStartY + rowHeight;
  const bottomLimit = doc.page.height - doc.page.margins.bottom - 20;

  doc.fontSize(9);
  for (let ri = 0; ri < rows.length; ri++) {
    if (y + rowHeight > bottomLimit) {
      doc.addPage({
        size: "A4",
        layout: "landscape",
        margins: { top: 40, bottom: 60, left: 32, right: 32 },
      });
      y = doc.page.margins.top;
      drawHeader(y);
      y += rowHeight;
    }

    // Zebra
    if (ri % 2 === 1) {
      doc.rect(doc.page.margins.left, y, pageWidth, rowHeight).fill("#F5F7FB");
      doc.fillColor("#0F1F39");
    }

    let x = doc.page.margins.left;
    for (let i = 0; i < columns.length; i++) {
      const text = formatCell(columns[i]!, columns[i]!.value(rows[ri]!));
      doc.fillColor("#0F1F39").font("body");
      doc.text(text, x + cellPad, y + 5, {
        width: widths[i]! - cellPad * 2,
        align: columns[i]!.align ?? "left",
        lineBreak: false,
        ellipsis: true,
      });
      x += widths[i]!;
    }
    y += rowHeight;
  }

  if (footerNote) {
    // Draw the footer INSIDE the bottom margin band (above the physical
    // page edge but below the content area). Two things matter here:
    //   • lineBreak: false — otherwise pdfkit measures the text height,
    //     compares it against `page.height - margins.bottom`, and if the
    //     y position is even a hair past that line it auto-adds a NEW
    //     page and re-renders the footer there. That's how "τιμολόγιον"
    //     was ending up on a phantom second page for short tables.
    //   • y is placed at `page.height - 24`, safely within the physical
    //     page but far enough from the content that it reads as a footer.
    doc.font("body").fontSize(8).fillColor("#4A5568")
      .text(footerNote, doc.page.margins.left, doc.page.height - 24, {
        width: pageWidth,
        align: "left",
        lineBreak: false,
      });
  }
}

/**
 * Render a multi-section PDF (each section = its own title, meta box,
 * and table). New sections start on a fresh page. Used by the per-client
 * bundle export to combine documents + payments in one PDF.
 */
export async function toMultiSectionPdfBuffer(input: PdfMultiInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margins: { top: 40, bottom: 60, left: 32, right: 32 },
        info: { Title: input.documentTitle, Author: "timologion.gr" },
      });
      doc.registerFont("body", FONT_REGULAR);
      doc.registerFont("bold", FONT_BOLD);
      doc.font("body");

      const buffers: Buffer[] = [];
      doc.on("data", (b) => buffers.push(b as Buffer));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      input.sections.forEach((s, i) => {
        if (i > 0) {
          doc.addPage({
            size: "A4",
            layout: "landscape",
            margins: { top: 40, bottom: 60, left: 32, right: 32 },
          });
        }
        renderSection(doc, s);
      });
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderSection(doc: any, section: PdfSection) {
  render(doc, section);
}

/**
 * Wrap a PDF buffer as a downloadable Response.
 */
export function pdfResponse(buf: Buffer, filename: string): Response {
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
