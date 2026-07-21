import { describe, it, expect } from "vitest";
import { computeLine, computeDocument } from "./totals";

describe("computeLine", () => {
  it("computes net + vat + total for a simple line", () => {
    const r = computeLine({
      quantity: 2,
      unitPrice: 10,
      vatRate: 24,
      discountPct: 0,
    });
    expect(r.net.toString()).toBe("20");
    expect(r.vat.toString()).toBe("4.8");
    expect(r.total.toString()).toBe("24.8");
  });

  it("applies discount before VAT", () => {
    const r = computeLine({
      quantity: 1,
      unitPrice: 100,
      vatRate: 24,
      discountPct: 10,
    });
    expect(r.net.toString()).toBe("90");
    expect(r.vat.toString()).toBe("21.6");
    expect(r.total.toString()).toBe("111.6");
  });

  it("handles VAT-exempt lines", () => {
    const r = computeLine({
      quantity: 3,
      unitPrice: 15,
      vatRate: 0,
      discountPct: 0,
    });
    expect(r.net.toString()).toBe("45");
    expect(r.vat.toString()).toBe("0");
    expect(r.total.toString()).toBe("45");
  });

  it("rounds to 2 decimals half-up", () => {
    // 0.333 * 3 = 0.999 → rounds to 1.00
    const r = computeLine({
      quantity: 3,
      unitPrice: 0.333,
      vatRate: 0,
      discountPct: 0,
    });
    expect(r.net.toString()).toBe("1");
  });

  it("returns zero for empty inputs", () => {
    const r = computeLine({
      quantity: 0,
      unitPrice: 0,
    });
    expect(r.net.toString()).toBe("0");
    expect(r.vat.toString()).toBe("0");
    expect(r.total.toString()).toBe("0");
  });

  it("supports string inputs (from form data)", () => {
    const r = computeLine({
      quantity: "2",
      unitPrice: "9.99",
      vatRate: "13",
      discountPct: "0",
    });
    expect(r.net.toString()).toBe("19.98");
    expect(r.vat.toString()).toBe("2.6");
    expect(r.total.toString()).toBe("22.58");
  });
});

describe("computeDocument", () => {
  it("sums multiple lines correctly", () => {
    const totals = computeDocument([
      { quantity: 1, unitPrice: 100, vatRate: 24 },
      { quantity: 2, unitPrice: 50, vatRate: 13 },
    ]);
    // Line 1: net 100, vat 24, total 124
    // Line 2: net 100, vat 13, total 113
    expect(totals.netTotal.toString()).toBe("200");
    expect(totals.vatTotal.toString()).toBe("37");
    expect(totals.total.toString()).toBe("237");
  });

  it("handles empty documents", () => {
    const totals = computeDocument([]);
    expect(totals.netTotal.toString()).toBe("0");
    expect(totals.vatTotal.toString()).toBe("0");
    expect(totals.total.toString()).toBe("0");
  });

  it("keeps per-line rounding independent", () => {
    // 5 x €0.10 with VAT 24% per line, three times.
    const totals = computeDocument([
      { quantity: 5, unitPrice: 0.1, vatRate: 24 },
      { quantity: 5, unitPrice: 0.1, vatRate: 24 },
      { quantity: 5, unitPrice: 0.1, vatRate: 24 },
    ]);
    // Each line: net 0.50, vat 0.12, total 0.62
    expect(totals.netTotal.toString()).toBe("1.5");
    expect(totals.vatTotal.toString()).toBe("0.36");
    expect(totals.total.toString()).toBe("1.86");
  });
});
