import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select, Field } from "@/components/ui/Input";
import { Button, LinkButton } from "@/components/ui/Button";
import { ArrowLeft, Filter } from "lucide-react";
import { t } from "@/lib/i18n";
import { StatisticsClient } from "./StatisticsClient";
import type { DocumentType, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const DOC_TYPES: DocumentType[] = [
  "invoice",
  "service_invoice",
  "retail_receipt",
  "service_receipt",
  "credit_note",
  "proforma",
  "quote",
  "order",
  "delivery_note",
];

const GREEK_MONTHS = [
  "Ιαν",
  "Φεβ",
  "Μάρ",
  "Απρ",
  "Μάι",
  "Ιούν",
  "Ιούλ",
  "Αύγ",
  "Σεπ",
  "Οκτ",
  "Νοέ",
  "Δεκ",
];

type SearchParams = { year?: string; type?: DocumentType };

export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:read");

  const params = await searchParams;
  const now = new Date();
  const currentYear = now.getFullYear();
  const selectedYear = Number(params.year) || currentYear;
  const typeFilter = params.type;

  const baseWhere: Prisma.DocumentWhereInput = {
    businessId: ctx.businessId,
    status: "issued",
    ...(typeFilter ? { type: typeFilter } : {}),
  };

  const oldest = await prisma.document.findFirst({
    where: { businessId: ctx.businessId },
    select: { issueDate: true },
    orderBy: { issueDate: "asc" },
  });
  const earliestYear = oldest?.issueDate.getFullYear() ?? currentYear;
  const availableYears: number[] = [];
  for (let y = currentYear; y >= earliestYear; y--) availableYears.push(y);

  const yearStart = new Date(selectedYear, 0, 1);
  const yearEnd = new Date(selectedYear + 1, 0, 1);
  const prevYearStart = new Date(selectedYear - 1, 0, 1);
  const monthStart = new Date(currentYear, now.getMonth(), 1);
  const prevMonthStart = new Date(currentYear, now.getMonth() - 1, 1);
  const last30 = new Date(now.getTime() - 30 * 86_400_000);

  const [
    monthAgg,
    prevMonthAgg,
    ytdAgg,
    lifetimeAgg,
    yearDocs,
    prevYearDocs,
    monthly,
    daily,
    yearly,
    topClientsGroup,
  ] = await Promise.all([
    prisma.document.aggregate({
      where: { ...baseWhere, issueDate: { gte: monthStart } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.document.aggregate({
      where: {
        ...baseWhere,
        issueDate: { gte: prevMonthStart, lt: monthStart },
      },
      _sum: { totalAmount: true },
    }),
    prisma.document.aggregate({
      where: {
        ...baseWhere,
        issueDate: { gte: new Date(currentYear, 0, 1) },
      },
      _sum: { totalAmount: true },
    }),
    prisma.document.aggregate({
      where: baseWhere,
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.document.findMany({
      where: { ...baseWhere, issueDate: { gte: yearStart, lt: yearEnd } },
      select: { issueDate: true, totalAmount: true, vatTotalAmount: true },
    }),
    prisma.document.findMany({
      where: { ...baseWhere, issueDate: { gte: prevYearStart, lt: yearStart } },
      select: { totalAmount: true },
    }),
    aggregateByMonth(baseWhere, selectedYear),
    aggregateByDay(baseWhere, last30, now),
    aggregateByYear(baseWhere, earliestYear, currentYear),
    prisma.document.groupBy({
      by: ["clientId"],
      where: { ...baseWhere, issueDate: { gte: yearStart, lt: yearEnd } },
      _sum: { totalAmount: true },
      _count: true,
      orderBy: { _sum: { totalAmount: "desc" } },
      take: 8,
    }),
  ]);

  const yearRevenue = yearDocs.reduce((a, d) => a + Number(d.totalAmount), 0);
  const prevYearRevenue = prevYearDocs.reduce(
    (a, d) => a + Number(d.totalAmount),
    0,
  );

  const clientIds = topClientsGroup
    .map((c) => c.clientId)
    .filter((v): v is string => !!v);
  const clientsMap = new Map<string, string>();
  if (clientIds.length) {
    const cs = await prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, legalName: true },
    });
    cs.forEach((c) => clientsMap.set(c.id, c.legalName));
  }

  const totalIssued = lifetimeAgg._count ?? 0;
  const lifetimeRevenue = Number(lifetimeAgg._sum.totalAmount ?? 0);
  const avgInvoice = totalIssued ? lifetimeRevenue / totalIssued : 0;

  const monthPoints = monthly.map((m, i) => ({
    label: GREEK_MONTHS[i]!,
    count: m.count,
    revenue: m.revenue,
    vat: m.vat,
  }));

  const yearlyPoints = yearly.map((v, i) => ({
    year: earliestYear + i,
    revenue: v,
  }));

  const dailyPoints = daily.map((d) => ({
    label: d.label,
    date: new Date(d.iso).toLocaleDateString("el-GR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    value: d.value,
  }));

  const topClients = topClientsGroup
    .map((g) => ({
      id: g.clientId ?? "no-client",
      name: g.clientId
        ? (clientsMap.get(g.clientId) ?? "Άγνωστος πελάτης")
        : "Χωρίς πελάτη",
      docs: g._count,
      revenue: Number(g._sum.totalAmount ?? 0),
    }))
    .slice(0, 8);

  return (
    <>
      <PageHeader
        title="Στατιστικά εσόδων"
        subtitle="Δείκτες σε πραγματικό χρόνο — πέρνα το ποντίκι πάνω από τις μπάρες."
        actions={
          <LinkButton href="/app/documents" variant="secondary" icon={ArrowLeft}>
            Παραστατικά
          </LinkButton>
        }
      />

      <form
        method="get"
        className="mb-6 grid gap-3 rounded-2xl border-2 border-ink-300 bg-white p-4 md:grid-cols-12"
      >
        <Field label="Έτος" htmlFor="year" className="md:col-span-3">
          <Select id="year" name="year" defaultValue={String(selectedYear)}>
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Τύπος παραστατικού" htmlFor="type" className="md:col-span-6">
          <Select id="type" name="type" defaultValue={typeFilter ?? ""}>
            <option value="">Όλοι οι τύποι</option>
            {DOC_TYPES.map((d) => (
              <option key={d} value={d}>
                {t.documents.types[d]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="md:col-span-3 md:self-end">
          <Field label=" " htmlFor="submit">
            <Button type="submit" size="md" className="w-full" icon={Filter}>
              Εφαρμογή
            </Button>
          </Field>
        </div>
      </form>

      <StatisticsClient
        selectedYear={selectedYear}
        currentYear={currentYear}
        months={monthPoints}
        daily={dailyPoints}
        yearly={yearlyPoints}
        topClients={topClients}
        kpis={{
          monthRevenue: Number(monthAgg._sum.totalAmount ?? 0),
          prevMonthRevenue: Number(prevMonthAgg._sum.totalAmount ?? 0),
          monthDocs: monthAgg._count ?? 0,
          yearRevenue,
          prevYearRevenue,
          yearDocs: yearDocs.length,
          ytdRevenue: Number(ytdAgg._sum.totalAmount ?? 0),
          lifetimeRevenue,
          lifetimeDocs: totalIssued,
          avgInvoice,
        }}
      />
    </>
  );
}

// ─── Server-side aggregators ───────────────────────────────────────────

async function aggregateByMonth(
  baseWhere: Prisma.DocumentWhereInput,
  year: number,
): Promise<{ count: number; revenue: number; vat: number }[]> {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const docs = await prisma.document.findMany({
    where: { ...baseWhere, issueDate: { gte: start, lt: end } },
    select: { issueDate: true, totalAmount: true, vatTotalAmount: true },
  });
  const buckets = Array.from({ length: 12 }, () => ({
    count: 0,
    revenue: 0,
    vat: 0,
  }));
  for (const d of docs) {
    const b = buckets[d.issueDate.getMonth()]!;
    b.count += 1;
    b.revenue += Number(d.totalAmount);
    b.vat += Number(d.vatTotalAmount);
  }
  return buckets;
}

async function aggregateByDay(
  baseWhere: Prisma.DocumentWhereInput,
  from: Date,
  to: Date,
): Promise<{ label: string; iso: string; value: number }[]> {
  const docs = await prisma.document.findMany({
    where: { ...baseWhere, issueDate: { gte: from, lte: to } },
    select: { issueDate: true, totalAmount: true },
  });
  const buckets = new Map<string, number>();
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= to) {
    buckets.set(cursor.toISOString().slice(0, 10), 0);
    cursor.setDate(cursor.getDate() + 1);
  }
  for (const d of docs) {
    const key = d.issueDate.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + Number(d.totalAmount));
  }
  return Array.from(buckets.entries()).map(([iso, value]) => ({
    iso,
    label: iso.slice(5),
    value,
  }));
}

async function aggregateByYear(
  baseWhere: Prisma.DocumentWhereInput,
  fromYear: number,
  toYear: number,
): Promise<number[]> {
  const docs = await prisma.document.findMany({
    where: {
      ...baseWhere,
      issueDate: {
        gte: new Date(fromYear, 0, 1),
        lt: new Date(toYear + 1, 0, 1),
      },
    },
    select: { issueDate: true, totalAmount: true },
  });
  const totals = Array<number>(toYear - fromYear + 1).fill(0);
  for (const d of docs) {
    totals[d.issueDate.getFullYear() - fromYear]! += Number(d.totalAmount);
  }
  return totals;
}
