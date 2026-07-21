import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { money } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

// Return the last N months as [{ label, from, to }].
function lastMonths(n: number) {
  const out: { label: string; from: Date; to: Date }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const label = from
      .toLocaleDateString("el-GR", { month: "short", year: "2-digit" })
      .replace(".", "");
    out.push({ label, from, to });
  }
  return out;
}

export default async function AdminEconomicsPage() {
  await requireAdmin();

  const months = lastMonths(6);

  const monthly = await Promise.all(
    months.map(async (m) => {
      const [count, agg] = await Promise.all([
        prisma.document.count({
          where: {
            issueDate: { gte: m.from, lt: m.to },
            status: "issued",
          },
        }),
        prisma.document.aggregate({
          where: {
            issueDate: { gte: m.from, lt: m.to },
            status: "issued",
          },
          _sum: { totalAmount: true, vatTotalAmount: true },
        }),
      ]);
      return {
        label: m.label,
        count,
        revenue: Number(agg._sum.totalAmount ?? 0),
        vat: Number(agg._sum.vatTotalAmount ?? 0),
      };
    }),
  );

  const totalIssued = await prisma.document.aggregate({
    where: { status: "issued" },
    _sum: { totalAmount: true, vatTotalAmount: true },
    _count: true,
  });
  const totalDrafts = await prisma.document.count({
    where: { status: "draft" },
  });

  // Top 10 by tracked revenue (sum of issued totalAmount).
  const topByRevenue = await prisma.document.groupBy({
    by: ["businessId"],
    where: { status: "issued" },
    _sum: { totalAmount: true },
    _count: true,
    orderBy: { _sum: { totalAmount: "desc" } },
    take: 10,
  });
  const topBusinesses = topByRevenue.length
    ? await prisma.business.findMany({
        where: { id: { in: topByRevenue.map((r) => r.businessId) } },
        select: { id: true, legalName: true, tradeName: true, vatNumber: true },
      })
    : [];

  const maxRevenue = Math.max(1, ...monthly.map((m) => m.revenue));

  return (
    <>
      <PageHeader
        title="Οικονομικά"
        subtitle="Συνολική εικόνα εσόδων και όγκου εντός της πλατφόρμας."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi
          label="Εκδοθέντα (σύνολο)"
          value={String(totalIssued._count)}
          sub={`${totalDrafts} πρόχειρα σε αναμονή`}
        />
        <Kpi
          label="Έσοδα εντός πλατφόρμας"
          value={money(totalIssued._sum.totalAmount ?? 0)}
          sub="Άθροισμα totalAmount εκδοθέντων"
        />
        <Kpi
          label="ΦΠΑ (συνολικά)"
          value={money(totalIssued._sum.vatTotalAmount ?? 0)}
          sub="Άθροισμα vatTotalAmount"
        />
        <Kpi
          label="Μέση αξία παραστατικού"
          value={money(
            totalIssued._count
              ? Number(totalIssued._sum.totalAmount ?? 0) / totalIssued._count
              : 0,
          )}
        />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader
              title="Έσοδα ανά μήνα"
              subtitle="Τελευταίοι 6 μήνες"
            />
            <CardBody>
              <div className="flex h-56 items-end gap-3">
                {monthly.map((m) => {
                  const h = Math.max(4, (m.revenue / maxRevenue) * 100);
                  return (
                    <div
                      key={m.label}
                      className="flex flex-1 flex-col items-center gap-2"
                    >
                      <div
                        className="w-full rounded-t-md bg-brand-600 transition-all"
                        style={{ height: `${h}%` }}
                        title={money(m.revenue)}
                      />
                      <div className="w-full text-center text-xs text-ink-500">
                        {m.label}
                      </div>
                    </div>
                  );
                })}
              </div>
              <table className="mt-6 w-full text-sm">
                <thead className="text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="text-left">Μήνας</th>
                    <th className="text-right">Παραστατικά</th>
                    <th className="text-right">Έσοδα</th>
                    <th className="text-right">ΦΠΑ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-300/60">
                  {monthly.map((m) => (
                    <tr key={m.label}>
                      <td className="py-1.5">{m.label}</td>
                      <td className="py-1.5 text-right">{m.count}</td>
                      <td className="py-1.5 text-right font-medium">
                        {money(m.revenue)}
                      </td>
                      <td className="py-1.5 text-right text-ink-700">
                        {money(m.vat)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title="Top επιχειρήσεις" subtitle="Ανά συνολικά έσοδα" />
          <CardBody className="p-0">
            <ol className="divide-y divide-ink-300/60 text-sm">
              {topByRevenue.map((r, i) => {
                const b = topBusinesses.find((bb) => bb.id === r.businessId);
                if (!b) return null;
                return (
                  <li key={r.businessId} className="flex items-center gap-3 px-4 py-3">
                    <Badge tone="brand">#{i + 1}</Badge>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/businesses/${b.id}`}
                        className="block truncate text-sm font-medium text-brand-700 hover:text-brand-800"
                      >
                        {b.tradeName ?? b.legalName}
                      </Link>
                      <div className="text-xs text-ink-500">
                        ΑΦΜ {b.vatNumber} · {r._count} παραστ.
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold">
                      {money(r._sum.totalAmount ?? 0)}
                    </div>
                  </li>
                );
              })}
              {topByRevenue.length === 0 && (
                <li className="p-4 text-sm text-ink-500">
                  Δεν υπάρχουν ακόμα εκδοθέντα παραστατικά.
                </li>
              )}
            </ol>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold text-brand-900">{value}</p>
        {sub && <p className="mt-1 text-xs text-ink-500">{sub}</p>}
      </CardBody>
    </Card>
  );
}
