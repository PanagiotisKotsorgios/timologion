import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Financial pulse: MRR, ARR, active subscribers, churn signals,
 * top plans. All derivations run from BusinessSubscription — we're
 * the source of truth for what each tenant is on, and prices come
 * from PlatformPlan (with an optional priceOverride for grandfathered
 * deals).
 */
export default async function AdminMetricsPage() {
  await requireAdmin("super_admin", "analyst");

  // Everything active enough to count for MRR: active, trialing,
  // past_due (customer still using, biller retrying).
  const activeSubs = await prisma.businessSubscription.findMany({
    where: { status: { in: ["active", "trialing", "past_due"] } },
    include: { plan: true },
  });

  let mrr = 0;
  let arr = 0;
  const planBreakdown = new Map<
    string,
    { name: string; count: number; mrr: number }
  >();

  for (const s of activeSubs) {
    const monthly =
      s.priceOverride != null
        ? Number(s.priceOverride) / (s.billingCycle === "yearly" ? 12 : 1)
        : s.billingCycle === "yearly"
          ? Number(s.plan.priceYearly) / 12
          : Number(s.plan.priceMonthly);
    mrr += monthly;
    arr += monthly * 12;
    const key = s.plan.id;
    const row = planBreakdown.get(key) ?? {
      name: s.plan.name,
      count: 0,
      mrr: 0,
    };
    row.count += 1;
    row.mrr += monthly;
    planBreakdown.set(key, row);
  }

  const now = new Date();
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const quarterAgo = new Date(now);
  quarterAgo.setMonth(quarterAgo.getMonth() - 3);

  const [
    newLastMonth,
    cancelledLastMonth,
    trialingCount,
    pastDueCount,
    totalBusinesses,
    freeBusinesses,
    lastQuarterRevenue,
    monthlyBuckets,
  ] = await Promise.all([
    prisma.businessSubscription.count({
      where: {
        createdAt: { gte: monthAgo },
        status: { in: ["active", "trialing"] },
      },
    }),
    prisma.businessSubscription.count({
      where: {
        cancelledAt: { gte: monthAgo },
      },
    }),
    prisma.businessSubscription.count({
      where: { status: "trialing" },
    }),
    prisma.businessSubscription.count({
      where: { status: "past_due" },
    }),
    prisma.business.count(),
    prisma.business.count({
      where: {
        subscriptions: {
          none: {
            status: { in: ["active", "trialing", "past_due"] },
          },
        },
      },
    }),
    prisma.platformInvoice.aggregate({
      where: {
        issueDate: { gte: quarterAgo },
        status: "issued",
      },
      _sum: { totalAmount: true, margin: true, providerCost: true },
    }),
    // Rough monthly revenue chart — group platformInvoices by issueDate month.
    prisma.$queryRawUnsafe<
      Array<{ month: string; total: number; count: bigint }>
    >(
      `SELECT DATE_FORMAT(issueDate, '%Y-%m') AS month,
              SUM(totalAmount)                AS total,
              COUNT(*)                        AS count
       FROM platform_invoices
       WHERE status = 'issued'
         AND issueDate >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY month
       ORDER BY month ASC`,
    ),
  ]);

  const churnRate =
    activeSubs.length + cancelledLastMonth === 0
      ? 0
      : (cancelledLastMonth / (activeSubs.length + cancelledLastMonth)) * 100;

  // Prev-period comparison: same aggregates but shifted back one month.
  const twoMonthsAgo = new Date(now);
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  const [newPrevMonth, cancelledPrevMonth, revenuePrevMonth, revenueThisMonth] =
    await Promise.all([
      prisma.businessSubscription.count({
        where: {
          createdAt: { gte: twoMonthsAgo, lt: monthAgo },
          status: { in: ["active", "trialing"] },
        },
      }),
      prisma.businessSubscription.count({
        where: {
          cancelledAt: { gte: twoMonthsAgo, lt: monthAgo },
        },
      }),
      prisma.platformInvoice.aggregate({
        where: {
          issueDate: { gte: twoMonthsAgo, lt: monthAgo },
          status: "issued",
        },
        _sum: { totalAmount: true },
      }),
      prisma.platformInvoice.aggregate({
        where: {
          issueDate: { gte: monthAgo, lte: now },
          status: "issued",
        },
        _sum: { totalAmount: true },
      }),
    ]);

  const prevRev = Number(revenuePrevMonth._sum.totalAmount ?? 0);
  const thisRev = Number(revenueThisMonth._sum.totalAmount ?? 0);
  const revDelta =
    prevRev > 0 ? ((thisRev - prevRev) / prevRev) * 100 : null;

  const newDelta =
    newPrevMonth > 0
      ? ((newLastMonth - newPrevMonth) / newPrevMonth) * 100
      : null;
  const cancelledDelta =
    cancelledPrevMonth > 0
      ? ((cancelledLastMonth - cancelledPrevMonth) / cancelledPrevMonth) * 100
      : null;

  return (
    <>
      <PageHeader
        title="Οικονομικοί δείκτες"
        subtitle="Live MRR/ARR από τις τρέχουσες συνδρομές, όχι από historic ledger."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="MRR" value={money(mrr)} sub="Monthly recurring revenue" tone="brand" />
        <MetricCard label="ARR" value={money(arr)} sub="Annual run-rate" tone="brand" />
        <MetricCard
          label="Ενεργές συνδρομές"
          value={activeSubs.length.toLocaleString("el-GR")}
          sub={`${trialingCount} trial · ${pastDueCount} past_due`}
          tone="success"
        />
        <MetricCard
          label="Churn (τελευταίος μήνας)"
          value={`${churnRate.toFixed(2)}%`}
          sub={`${cancelledLastMonth} ακυρώσεις · ${newLastMonth} νέες`}
          tone={churnRate > 5 ? "danger" : "muted"}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Συνολικές επιχειρήσεις"
          value={totalBusinesses.toLocaleString("el-GR")}
          sub={`${totalBusinesses - freeBusinesses} paying · ${freeBusinesses} free`}
          tone="muted"
        />
        <MetricCard
          label="Έσοδα 3μήνου"
          value={money(Number(lastQuarterRevenue._sum.totalAmount ?? 0))}
          sub={`Κόστος: ${money(Number(lastQuarterRevenue._sum.providerCost ?? 0))}`}
          tone="muted"
        />
        <MetricCard
          label="Περιθώριο 3μήνου"
          value={money(Number(lastQuarterRevenue._sum.margin ?? 0))}
          sub="Έσοδα − κόστος παρόχου"
          tone="success"
        />
        <MetricCard
          label="ARPU"
          value={
            activeSubs.length > 0 ? money(mrr / activeSubs.length) : money(0)
          }
          sub="Μέσος μηνιαίος πελάτης"
          tone="muted"
        />
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Σύγκριση μήνα με προηγούμενο"
          subtitle="Τρέχων μήνας vs ίδιο διάστημα του προηγούμενου."
        />
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-2 text-left">Μετρική</th>
                <th className="px-4 py-2 text-right">Προηγούμενος μήνας</th>
                <th className="px-4 py-2 text-right">Τρέχων μήνας</th>
                <th className="px-4 py-2 text-right">Δ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-300/60">
              <ComparisonRow
                label="Νέες συνδρομές"
                prev={newPrevMonth}
                curr={newLastMonth}
                delta={newDelta}
                inverted={false}
              />
              <ComparisonRow
                label="Ακυρώσεις"
                prev={cancelledPrevMonth}
                curr={cancelledLastMonth}
                delta={cancelledDelta}
                inverted={true}
              />
              <ComparisonRow
                label="Έσοδα (€)"
                prev={prevRev}
                curr={thisRev}
                delta={revDelta}
                inverted={false}
                money
              />
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Ανάλυση ανά πακέτο"
          subtitle="Ενεργές συνδρομές, MRR contribution ανά plan."
        />
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-2 text-left">Πακέτο</th>
                <th className="px-4 py-2 text-right">Πελάτες</th>
                <th className="px-4 py-2 text-right">MRR</th>
                <th className="px-4 py-2 text-right">% του MRR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-300/60">
              {Array.from(planBreakdown.values())
                .sort((a, b) => b.mrr - a.mrr)
                .map((r) => (
                  <tr key={r.name}>
                    <td className="px-4 py-2 font-medium text-ink-900">
                      {r.name}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {r.count}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold">
                      {money(r.mrr)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-ink-700">
                      {mrr > 0 ? ((r.mrr / mrr) * 100).toFixed(1) : "0.0"}%
                    </td>
                  </tr>
                ))}
              {planBreakdown.size === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-ink-500">
                    Δεν υπάρχουν ενεργές συνδρομές.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Έσοδα ανά μήνα (12 μήνες)"
          subtitle="Ιστορικό εκδοθέντων platform-invoices."
        />
        <CardBody>
          <MonthlyChart
            data={monthlyBuckets.map((b) => ({
              month: b.month,
              total: Number(b.total),
              count: Number(b.count),
            }))}
          />
        </CardBody>
      </Card>
    </>
  );
}

function ComparisonRow({
  label,
  prev,
  curr,
  delta,
  inverted,
  money: isMoney,
}: {
  label: string;
  prev: number;
  curr: number;
  delta: number | null;
  inverted: boolean;
  money?: boolean;
}) {
  const fmt = (n: number) =>
    isMoney ? money(n) : n.toLocaleString("el-GR");
  const positive = delta != null && delta > 0;
  const tone =
    delta == null
      ? "text-ink-500"
      : (positive && !inverted) || (!positive && inverted)
        ? "text-emerald-700"
        : "text-red-700";
  return (
    <tr>
      <td className="px-4 py-2 font-medium text-ink-900">{label}</td>
      <td className="px-4 py-2 text-right tabular-nums text-ink-700">
        {fmt(prev)}
      </td>
      <td className="px-4 py-2 text-right tabular-nums font-bold text-ink-900">
        {fmt(curr)}
      </td>
      <td className={`px-4 py-2 text-right tabular-nums font-bold ${tone}`}>
        {delta == null
          ? "—"
          : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`}
      </td>
    </tr>
  );
}

function MetricCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "brand" | "success" | "danger" | "muted";
}) {
  const toneCls =
    tone === "brand"
      ? "border-brand-300 bg-brand-50/50"
      : tone === "success"
        ? "border-emerald-300 bg-emerald-50/50"
        : tone === "danger"
          ? "border-red-300 bg-red-50/50"
          : "border-ink-300 bg-white";
  return (
    <div className={`rounded-2xl border-2 p-5 shadow-sm ${toneCls}`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-ink-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black tabular-nums text-ink-900">
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-600">{sub}</p>
    </div>
  );
}

function MonthlyChart({
  data,
}: {
  data: { month: string; total: number; count: number }[];
}) {
  if (data.length === 0) {
    return (
      <p className="p-4 text-sm text-ink-500">
        Δεν έχουν εκδοθεί ακόμη platform-invoices.
      </p>
    );
  }
  const max = Math.max(...data.map((d) => d.total));
  return (
    <div className="space-y-2">
      {data.map((d) => {
        const pct = max > 0 ? (d.total / max) * 100 : 0;
        return (
          <div key={d.month} className="flex items-center gap-3">
            <span className="mono w-16 shrink-0 text-xs text-ink-500">
              {d.month}
            </span>
            <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-ink-100">
              <div
                className="h-full bg-brand-700 transition-all"
                style={{ width: `${pct}%` }}
              />
              <span className="absolute inset-0 flex items-center px-2 text-xs font-bold text-white mix-blend-difference">
                {money(d.total)} · {d.count} inv
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
