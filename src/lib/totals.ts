import { Prisma } from "@prisma/client";

export type LineInput = {
  quantity: number | string | Prisma.Decimal;
  unitPrice: number | string | Prisma.Decimal;
  discountPct?: number | string | Prisma.Decimal;
  vatRate?: number | string | Prisma.Decimal;
};

export type LineTotals = {
  net: Prisma.Decimal;
  vat: Prisma.Decimal;
  total: Prisma.Decimal;
};

export type DocumentTotals = {
  netTotal: Prisma.Decimal;
  vatTotal: Prisma.Decimal;
  total: Prisma.Decimal;
};

const D = Prisma.Decimal;
const ZERO = new D(0);
const HUNDRED = new D(100);

function d(v: LineInput["quantity"] | undefined): Prisma.Decimal {
  if (v === undefined || v === null || v === "") return ZERO;
  return new D(typeof v === "string" || typeof v === "number" ? v : v.toString());
}

export function computeLine(line: LineInput): LineTotals {
  const qty = d(line.quantity);
  const price = d(line.unitPrice);
  const discountPct = d(line.discountPct);
  const vatRate = d(line.vatRate);

  const gross = qty.mul(price);
  const discount = gross.mul(discountPct).div(HUNDRED);
  const net = gross.sub(discount);
  const vat = net.mul(vatRate).div(HUNDRED);
  const total = net.add(vat);

  return {
    net: round2(net),
    vat: round2(vat),
    total: round2(total),
  };
}

export function computeDocument(lines: LineInput[]): DocumentTotals {
  return lines.reduce<DocumentTotals>(
    (acc, l) => {
      const t = computeLine(l);
      return {
        netTotal: acc.netTotal.add(t.net),
        vatTotal: acc.vatTotal.add(t.vat),
        total: acc.total.add(t.total),
      };
    },
    { netTotal: ZERO, vatTotal: ZERO, total: ZERO },
  );
}

function round2(v: Prisma.Decimal): Prisma.Decimal {
  return v.toDecimalPlaces(2, D.ROUND_HALF_UP);
}
