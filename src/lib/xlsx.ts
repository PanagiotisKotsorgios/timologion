import "server-only";
import ExcelJS from "exceljs";
import type { Prisma } from "@prisma/client";

/**
 * XLSX writer with the same column-definition shape as csv.ts so the two
 * exporters can share the same column list. Values are converted to
 * appropriate cell types (Date, number, string) so Excel formats them
 * natively — dates as dates, amounts as numbers with 2 decimals.
 */

export type XlsxCellValue =
  | string
  | number
  | boolean
  | Date
  | Prisma.Decimal
  | null
  | undefined;

export type XlsxColumn<T> = {
  header: string;
  value: (row: T) => XlsxCellValue;
  /**
   * Optional Excel number-format hint. Ignored for non-numeric cells.
   * Common values: "€#,##0.00" for money, "0.00" for plain decimals,
   * "yyyy-mm-dd" for dates, "yyyy-mm-dd hh:mm" for datetimes.
   */
  format?: string;
  /** Optional preferred column width in Excel character units. */
  width?: number;
};

/**
 * Build an XLSX workbook buffer from row data + column definitions.
 * Applies the timologion accent color to the header row for a cleaner
 * look than the default bland gray.
 */
export async function toXlsxBuffer<T>(
  rows: T[],
  columns: XlsxColumn<T>[],
  options: { sheetName?: string; title?: string } = {},
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "timologion.gr";
  wb.created = new Date();
  const ws = wb.addWorksheet(options.sheetName?.slice(0, 30) || "Sheet1");

  let headerRowIndex = 1;

  if (options.title) {
    ws.mergeCells(1, 1, 1, columns.length);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = options.title;
    titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FF0F1F39" } };
    titleCell.alignment = { vertical: "middle", horizontal: "left" };
    ws.getRow(1).height = 22;
    headerRowIndex = 2;
  }

  ws.columns = columns.map((c) => ({
    header: c.header,
    key: c.header,
    width: c.width ?? Math.max(12, Math.min(40, c.header.length + 4)),
    style: c.format ? { numFmt: c.format } : undefined,
  }));

  if (options.title) {
    // ExcelJS placed the header on row 1 by ws.columns config, but our title
    // occupies row 1. Insert a real header row at row 2 manually.
    ws.spliceRows(1, 1);
    ws.insertRow(headerRowIndex, columns.map((c) => c.header));
  }

  const headerRow = ws.getRow(headerRowIndex);
  headerRow.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "left" };
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F1F39" },
    };
    cell.border = {
      bottom: { style: "medium", color: { argb: "FF0F1F39" } },
    };
  });

  for (const row of rows) {
    const values = columns.map((c) => {
      const v = c.value(row);
      if (v == null) return null;
      // Prisma Decimal has toNumber()
      if (typeof v === "object" && "toNumber" in v && typeof v.toNumber === "function") {
        return (v as Prisma.Decimal).toNumber();
      }
      return v as string | number | boolean | Date;
    });
    ws.addRow(values);
  }

  // Zebra striping for readability.
  const totalRows = ws.rowCount;
  for (let r = headerRowIndex + 1; r <= totalRows; r++) {
    if ((r - headerRowIndex) % 2 === 0) {
      const row = ws.getRow(r);
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF5F7FB" },
        };
      });
    }
  }

  ws.views = [{ state: "frozen", ySplit: headerRowIndex }];

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

/**
 * Wrap an XLSX buffer in a Response with the correct MIME type and
 * download filename.
 */
export function xlsxResponse(buf: Buffer, filename: string): Response {
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
