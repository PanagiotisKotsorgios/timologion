import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { date, money } from "@/lib/format";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  await requireAdmin();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const last30 = new Date(now.getTime() - 30 * 86_400_000);

  const [
    users,
    admins,
    businesses,
    activeBusinesses,
    documents,
    monthDocs,
    prevMonthDocs,
    monthRevenue,
    prevMonthRevenue,
    totalRevenue,
    newUsers30d,
    recentUsers,
    recentBusinesses,
    recentAudit,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { platformRole: { not: null } } }),
    prisma.business.count(),
    prisma.business.count({
      where: { documents: { some: { issueDate: { gte: monthStart } } } },
    }),
    prisma.document.count(),
    prisma.document.count({
      where: { issueDate: { gte: monthStart } },
    }),
    prisma.document.count({
      where: {
        issueDate: { gte: prevMonthStart, lt: monthStart },
      },
    }),
    prisma.document.aggregate({
      where: { issueDate: { gte: monthStart } },
      _sum: { totalAmount: true },
    }),
    prisma.document.aggregate({
      where: { issueDate: { gte: prevMonthStart, lt: monthStart } },
      _sum: { totalAmount: true },
    }),
    prisma.document.aggregate({ _sum: { totalAmount: true } }),
    prisma.user.count({ where: { createdAt: { gte: last30 } } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        email: true,
        fullName: true,
        createdAt: true,
        platformRole: true,
        _count: { select: { memberships: true } },
      },
    }),
    prisma.business.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        legalName: true,
        tradeName: true,
        vatNumber: true,
        createdAt: true,
        _count: { select: { documents: true, members: true } },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        action: true,
        entityType: true,
        userId: true,
        businessId: true,
      },
    }),
  ]);

  const monthDelta = growth(monthDocs, prevMonthDocs);
  const revenueDelta = growth(
    Number(monthRevenue._sum.totalAmount ?? 0),
    Number(prevMonthRevenue._sum.totalAmount ?? 0),
  );

  return (
    <>
      <PageHeader
        title="Επισκόπηση πλατφόρμας"
        subtitle="Ζωντανή εικόνα χρηστών, επιχειρήσεων, παραστατικών και ροής εσόδων."
        actions={
          <>
            <LinkButton href="/admin/economics" variant="secondary">
              Οικονομικά
            </LinkButton>
            <LinkButton href="/admin/audit" variant="secondary">
              Audit log
            </LinkButton>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Χρήστες" value={users} sub={`+${newUsers30d} τελ. 30 ημ.`} />
        <Kpi
          label="Επιχειρήσεις"
          value={businesses}
          sub={`${activeBusinesses} ενεργές αυτόν τον μήνα`}
        />
        <Kpi
          label="Παραστατικά (σύνολο)"
          value={documents}
          sub={`${monthDocs} αυτόν τον μήνα`}
          delta={monthDelta}
        />
        <Kpi
          label="Έσοδα εντός πλατφόρμας"
          value={money(totalRevenue._sum.totalAmount ?? 0)}
          sub={`${money(monthRevenue._sum.totalAmount ?? 0)} τρέχ. μήνα`}
          delta={revenueDelta}
        />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Πρόσφατες επιχειρήσεις"
              action={
                <LinkButton
                  href="/admin/businesses"
                  variant="ghost"
                  size="sm"
                >
                  Όλες →
                </LinkButton>
              }
            />
            <CardBody className="p-0">
              {recentBusinesses.length === 0 ? (
                <p className="p-6 text-sm text-ink-500">
                  Δεν υπάρχουν επιχειρήσεις ακόμα.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Επιχείρηση</th>
                      <th className="px-4 py-2 text-left">ΑΦΜ</th>
                      <th className="px-4 py-2 text-right">Παραστατικά</th>
                      <th className="px-4 py-2 text-right">Μέλη</th>
                      <th className="px-4 py-2 text-left">Ημ/νία</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-300/60">
                    {recentBusinesses.map((b) => (
                      <tr key={b.id}>
                        <td className="px-4 py-2">
                          <Link
                            href={`/admin/businesses/${b.id}`}
                            className="font-medium text-brand-700 hover:text-brand-800"
                          >
                            {b.tradeName ?? b.legalName}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-ink-700">{b.vatNumber}</td>
                        <td className="px-4 py-2 text-right">
                          {b._count.documents}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {b._count.members}
                        </td>
                        <td className="px-4 py-2 text-ink-500">
                          {date(b.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Πρόσφατα audit events"
              action={
                <LinkButton href="/admin/audit" variant="ghost" size="sm">
                  Όλα →
                </LinkButton>
              }
            />
            <CardBody className="p-0">
              {recentAudit.length === 0 ? (
                <p className="p-6 text-sm text-ink-500">
                  Καμία καταγεγραμμένη ενέργεια.
                </p>
              ) : (
                <ul className="divide-y divide-ink-300/60 text-sm">
                  {recentAudit.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between px-4 py-2"
                    >
                      <div>
                        <span className="font-mono text-xs text-brand-700">
                          {a.action}
                        </span>
                        <span className="ml-2 text-xs text-ink-500">
                          {a.entityType ?? "—"}
                        </span>
                      </div>
                      <span className="text-xs text-ink-500">
                        {date(a.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Νέοι χρήστες"
              action={
                <LinkButton href="/admin/users" variant="ghost" size="sm">
                  Όλοι →
                </LinkButton>
              }
            />
            <CardBody className="p-0">
              <ul className="divide-y divide-ink-300/60">
                {recentUsers.map((u) => (
                  <li key={u.id} className="px-4 py-3">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-sm font-medium text-brand-700 hover:text-brand-800"
                    >
                      {u.fullName || u.email}
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-ink-500">
                      <span>{u.email}</span>
                      <span>·</span>
                      <span>{u._count.memberships} επιχ.</span>
                      {u.platformRole && (
                        <Badge tone="warning">{u.platformRole}</Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Καθεστώς πλατφόρμας" />
            <CardBody className="space-y-2 text-sm">
              <Row label="Platform admins" value={String(admins)} />
              <Row label="Σύνολο audit events (πρόσφατα)" value="σε πραγμ. χρόνο" />
              <Row label="Πάροχος έκδοσης" value="Συνεργαζόμενος (σε σύνδεση)" />
              <p className="mt-2 text-xs text-ink-500">
                {t.brand.providerNote}
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Kpi({
  label,
  value,
  sub,
  delta,
}: {
  label: string;
  value: string | number;
  sub?: string;
  delta?: number;
}) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold text-brand-900">{value}</p>
        {(sub || typeof delta === "number") && (
          <p className="mt-1 flex items-center gap-2 text-xs text-ink-500">
            {sub}
            {typeof delta === "number" && (
              <Badge tone={delta >= 0 ? "success" : "danger"}>
                {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}%
              </Badge>
            )}
          </p>
        )}
      </CardBody>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-300/60 pb-2 text-sm last:border-b-0 last:pb-0">
      <span className="text-ink-500">{label}</span>
      <span className="font-medium text-ink-900">{value}</span>
    </div>
  );
}

function growth(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0;
  return ((current - prev) / prev) * 100;
}
