import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = { period?: "24h" | "7d" | "30d" | "90d" };

const WINDOWS: Record<string, { label: string; hours: number }> = {
  "24h": { label: "24 ώρες", hours: 24 },
  "7d": { label: "7 ημέρες", hours: 24 * 7 },
  "30d": { label: "30 ημέρες", hours: 24 * 30 },
  "90d": { label: "90 ημέρες", hours: 24 * 90 },
};

export default async function AdminActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin("super_admin");
  const { id } = await params;
  const { period } = await searchParams;
  const win = WINDOWS[period ?? "7d"] ?? WINDOWS["7d"]!;
  const since = new Date(Date.now() - win.hours * 60 * 60 * 1000);

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      fullName: true,
      platformRole: true,
      mfaEnabled: true,
      suspendedAt: true,
      createdAt: true,
    },
  });
  if (!user) notFound();

  const [total, byAction, byDay, latest] = await Promise.all([
    prisma.auditLog.count({
      where: { userId: id, createdAt: { gte: since } },
    }),
    prisma.auditLog.groupBy({
      by: ["action"],
      where: { userId: id, createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { action: "desc" } },
      take: 20,
    }),
    prisma.$queryRawUnsafe<Array<{ day: string; n: bigint }>>(
      `SELECT DATE_FORMAT(createdAt, '%Y-%m-%d') AS day, COUNT(*) AS n
       FROM audit_logs
       WHERE userId = ? AND createdAt >= ?
       GROUP BY day
       ORDER BY day ASC`,
      id,
      since,
    ),
    prisma.auditLog.findMany({
      where: { userId: id, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  const maxDay = Math.max(...byDay.map((d) => Number(d.n)), 1);

  return (
    <>
      <PageHeader
        title={`${user.fullName || user.email} — δραστηριότητα`}
        subtitle={
          <span className="inline-flex items-center gap-2">
            {user.platformRole && (
              <Badge tone="warning">{user.platformRole}</Badge>
            )}
            <span className="text-xs text-ink-500">{user.email}</span>
          </span>
        }
        actions={
          <LinkButton href="/admin/admins" variant="secondary" icon={ArrowLeft}>
            Πίσω
          </LinkButton>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(WINDOWS).map(([k, v]) => (
          <Chip
            key={k}
            href={`/admin/admins/${id}?period=${k}`}
            label={v.label}
            active={(period ?? "7d") === k}
          />
        ))}
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <BigStat
          label={`Ενέργειες · ${win.label}`}
          value={total.toLocaleString("el-GR")}
        />
        <BigStat
          label="Ημέρες με δραστ."
          value={byDay.length.toLocaleString("el-GR")}
        />
        <BigStat
          label="Μέσος όρος/ημέρα"
          value={
            byDay.length > 0
              ? (total / byDay.length).toFixed(1)
              : "0"
          }
        />
      </div>

      <Card className="mb-6">
        <CardHeader
          title="Δραστηριότητα ανά ημέρα"
          subtitle={`${byDay.length} ημέρες με ενέργειες · max ${maxDay}/ημέρα`}
        />
        <CardBody>
          {byDay.length === 0 ? (
            <p className="text-sm text-ink-500">
              Καμία δραστηριότητα στο επιλεγμένο διάστημα.
            </p>
          ) : (
            <div className="space-y-1.5">
              {byDay.map((d) => {
                const n = Number(d.n);
                const pct = (n / maxDay) * 100;
                return (
                  <div key={d.day} className="flex items-center gap-3">
                    <span className="mono w-24 shrink-0 text-xs text-ink-500">
                      {d.day}
                    </span>
                    <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-ink-100">
                      <div
                        className="h-full bg-brand-700"
                        style={{ width: `${pct}%` }}
                      />
                      <span className="absolute inset-0 flex items-center px-2 text-[11px] font-bold text-white mix-blend-difference">
                        {n.toLocaleString("el-GR")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Top actions" />
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-2 text-left">Action</th>
                  <th className="px-4 py-2 text-right">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-300/60">
                {byAction.length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-6 text-center text-ink-500">
                      Καμία ενέργεια.
                    </td>
                  </tr>
                )}
                {byAction.map((a) => (
                  <tr key={a.action}>
                    <td className="px-4 py-2 mono text-xs">{a.action}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-bold">
                      {a._count._all.toLocaleString("el-GR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Πρόσφατες" />
          <CardBody className="p-0">
            <ul className="divide-y divide-ink-200 text-sm">
              {latest.length === 0 && (
                <li className="p-6 text-center text-ink-500">Καμία.</li>
              )}
              {latest.map((a) => (
                <li key={a.id} className="p-3">
                  <p className="mono text-xs font-bold text-brand-800">
                    {a.action}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-500">
                    {a.createdAt.toLocaleString("el-GR")}
                    {a.entityType && (
                      <>
                        {" · "}
                        {a.entityType}
                        {a.entityId && (
                          <>
                            {" "}
                            <Link
                              href={`/admin/audit?q=${encodeURIComponent(a.entityId)}`}
                              className="mono text-brand-800 hover:text-brand-900"
                            >
                              {a.entityId.slice(-8)}
                            </Link>
                          </>
                        )}
                      </>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Chip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <a
      href={href}
      className={
        "rounded-full border-2 px-3 py-1 text-xs font-bold " +
        (active
          ? "border-brand-800 bg-brand-700 text-white"
          : "border-ink-300 bg-white text-ink-800 hover:border-ink-500")
      }
    >
      {label}
    </a>
  );
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-ink-300 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-ink-500">
        {label}
      </p>
      <p className="mt-1 text-3xl font-black tabular-nums text-brand-900">
        {value}
      </p>
    </div>
  );
}
