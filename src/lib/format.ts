import type { Prisma } from "@prisma/client";

const nfCurrency = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const nfNumber = new Intl.NumberFormat("el-GR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Format dates in the Athens timezone — the app is Greek-tenanted and
// the production container runs in UTC. Without `timeZone` set, a
// `Date` created at Athens 01:00 (= UTC 23:00 prev day) formats as
// yesterday's calendar date, which is confusing for users and wrong on
// audit-visible surfaces (issued document dates, aging tables).
const nfDate = new Intl.DateTimeFormat("el-GR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Athens",
});

type Numeric = number | string | Prisma.Decimal;

function toNumber(v: Numeric): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  return Number(v.toString());
}

export function money(v: Numeric): string {
  return nfCurrency.format(toNumber(v));
}

export function num(v: Numeric): string {
  return nfNumber.format(toNumber(v));
}

export function date(v: Date | string): string {
  return nfDate.format(typeof v === "string" ? new Date(v) : v);
}
