/**
 * Minimal CSV encoder with UTF-8 BOM so Excel opens Greek characters
 * correctly without any extra plumbing.
 */

const BOM = "﻿";

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined | Date;
};

function escape(cell: string | number | null | undefined | Date): string {
  if (cell == null) return "";
  const s = cell instanceof Date ? cell.toISOString() : String(cell);
  if (/[",\n\r;]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const head = columns.map((c) => escape(c.header)).join(",");
  const body = rows
    .map((r) => columns.map((c) => escape(c.value(r))).join(","))
    .join("\n");
  return `${BOM}${head}\n${body}\n`;
}

/**
 * Turn the encoded CSV into a Response suitable for a route handler.
 * Content-Type is text/csv;charset=utf-8, with a friendly download filename.
 */
export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

/**
 * Parse a CSV string into rows (arrays of strings). Handles quoted fields,
 * escaped quotes (""), CRLF/LF line endings, and both comma and semicolon
 * separators. Strips a UTF-8 BOM if present.
 */
export function parseCsv(input: string): string[][] {
  const src = input.startsWith("﻿") ? input.slice(1) : input;
  const sep = detectSeparator(src);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === sep) {
      row.push(field);
      field = "";
      continue;
    }
    if (c === "\r") continue;
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || (r[0] ?? "").trim().length > 0);
}

function detectSeparator(src: string): string {
  const line = src.split(/\r?\n/, 1)[0] ?? "";
  const commas = (line.match(/,/g) ?? []).length;
  const semis = (line.match(/;/g) ?? []).length;
  return semis > commas ? ";" : ",";
}
