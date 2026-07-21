import { describe, it, expect } from "vitest";
import { toCsv, parseCsv } from "./csv";

describe("toCsv", () => {
  it("emits header + rows with BOM", () => {
    const out = toCsv(
      [{ a: 1, b: "hello" }],
      [
        { header: "A", value: (r) => r.a },
        { header: "B", value: (r) => r.b },
      ],
    );
    expect(out.startsWith("﻿")).toBe(true);
    expect(out).toContain("A,B");
    expect(out).toContain("1,hello");
  });

  it("quotes fields containing commas, quotes, or newlines", () => {
    const out = toCsv(
      [{ v: 'hello, "world"\nline2' }],
      [{ header: "V", value: (r) => r.v }],
    );
    // Comma → quoted, embedded quote → doubled, newline → preserved inside quotes.
    expect(out).toContain('"hello, ""world""\nline2"');
  });

  it("outputs empty for null/undefined values", () => {
    const out = toCsv(
      [{ v: null as null | string }],
      [{ header: "V", value: (r) => r.v }],
    );
    const lines = out.split("\n");
    // Line 1 is header, line 2 is empty value
    expect(lines[1]).toBe("");
  });
});

describe("parseCsv", () => {
  it("parses a basic comma-separated block", () => {
    const rows = parseCsv("name,age\nAlice,30\nBob,25\n");
    expect(rows).toEqual([
      ["name", "age"],
      ["Alice", "30"],
      ["Bob", "25"],
    ]);
  });

  it("strips a UTF-8 BOM if present", () => {
    const rows = parseCsv("﻿a,b\n1,2\n");
    expect(rows[0]).toEqual(["a", "b"]);
  });

  it("detects semicolon separator", () => {
    const rows = parseCsv("a;b\n1;2\n");
    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("handles quoted fields with commas and doubled quotes", () => {
    const rows = parseCsv('name,note\n"Smith, John","says ""hi"""\n');
    expect(rows).toEqual([
      ["name", "note"],
      ["Smith, John", 'says "hi"'],
    ]);
  });

  it("tolerates CRLF line endings", () => {
    const rows = parseCsv("a,b\r\n1,2\r\n");
    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("skips fully blank lines but keeps single-value rows", () => {
    const rows = parseCsv("a\n\nb\n");
    expect(rows).toEqual([["a"], ["b"]]);
  });
});
