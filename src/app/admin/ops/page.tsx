import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * Operations dashboard — cross-cutting queries support agents run
 * every day: dunning queue (past_due subs), stuck-user detection
 * (accounts mid-onboarding for too long), admin session log, and
 * Wrapp API usage broken down by tenant.
 */
export default async function AdminOpsPage() {
  await requireAdmin("super_admin", "support");

  const now = new Date();
  const daysAgo = (n: number) =>
    new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  const [
    pastDueSubs,
    unverifiedRecent,
    onboardingIncomplete,
    adminActions,
    wrappUsage,
  ] = await Promise.all([
    prisma.businessSubscription.findMany({
      where: { status: "past_due" },
      include: {
        plan: { select: { name: true, priceYearly: true } },
        business: { select: { id: true, legalName: true, vatNumber: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.user.findMany({
      where: {
        emailVerifiedAt: null,
        suspendedAt: null,
        createdAt: { lt: daysAgo(3), gt: daysAgo(30) },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        email: true,
        fullName: true,
        createdAt: true,
      },
    }),
    // Onboarding "incomplete" heuristic: user > 3 days old, verified,
    // but their business has no wrappConnection.
    prisma.business.findMany({
      where: {
        createdAt: { lt: daysAgo(3) },
        wrappConnection: null,
        suspendedAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        legalName: true,
        vatNumber: true,
        createdAt: true,
        _count: { select: { documents: true } },
      },
    }),
    prisma.auditLog.findMany({
      where: { action: { startsWith: "admin." } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    // Wrapp API usage over the last 30 days per partner_user_id (Wrapp's
    // ID for the tenant). Useful for noisy-neighbor detection.
    prisma.$queryRawUnsafe<Array<{ partnerUserId: string; hits: bigint }>>(
      `SELECT partnerUserId, COUNT(*) AS hits
       FROM wrapp_webhook_logs
       WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         AND partnerUserId IS NOT NULL
       GROUP BY partnerUserId
       ORDER BY hits DESC
       LIMIT 20`,
    ),
  ]);

  return (
    <>
      <PageHeader
        title="Operations"
        subtitle="Καθημερινές support ουρές: dunning, stuck users, admin activity, Wrapp usage."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader
            title={`Past-due συνδρομές (${pastDueSubs.length})`}
            subtitle="Πελάτες που η Wrapp δεν κατάφερε να χρεώσει."
          />
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-2 text-left">Επιχείρηση</th>
                  <th className="px-4 py-2 text-left">Πακέτο</th>
                  <th className="px-4 py-2 text-left">Ενημερώθηκε</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-300/60">
                {pastDueSubs.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-ink-500">
                      Καμία past_due συνδρομή.
                    </td>
                  </tr>
                )}
                {pastDueSubs.map((s) => (
                  <tr key={s.id} className="hover:bg-ink-100/40">
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/businesses/${s.business.id}`}
                        className="font-medium text-brand-700 hover:text-brand-800"
                      >
                        {s.business.legalName}
                      </Link>
                      <p className="mono text-xs text-ink-500">
                        ΑΦΜ {s.business.vatNumber}
                      </p>
                    </td>
                    <td className="px-4 py-2">{s.plan.name}</td>
                    <td className="px-4 py-2 text-ink-500 text-xs">
                      {s.updatedAt.toLocaleString("el-GR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={`Ανεπιβεβαίωτοι > 3 ημέρες (${unverifiedRecent.length})`}
            subtitle="Πιθανό stuck email verification — έλεγξε deliverability."
          />
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Εγγραφή</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-300/60">
                {unverifiedRecent.length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-6 text-center text-ink-500">
                      Όλοι επιβεβαιωμένοι.
                    </td>
                  </tr>
                )}
                {unverifiedRecent.map((u) => (
                  <tr key={u.id} className="hover:bg-ink-100/40">
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="font-medium text-brand-700 hover:text-brand-800"
                      >
                        {u.email}
                      </Link>
                      {u.fullName && (
                        <p className="text-xs text-ink-500">{u.fullName}</p>
                      )}
                    </td>
                    <td className="px-4 py-2 text-ink-500 text-xs">
                      {u.createdAt.toLocaleString("el-GR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader
            title={`Onboarding χωρίς Wrapp (${onboardingIncomplete.length})`}
            subtitle="Επιχειρήσεις > 3 ημέρες χωρίς σύνδεση με Wrapp — προτεραιότητα να τους καθοδηγήσουμε."
          />
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-2 text-left">Επιχείρηση</th>
                  <th className="px-4 py-2 text-left">ΑΦΜ</th>
                  <th className="px-4 py-2 text-right">Παραστ.</th>
                  <th className="px-4 py-2 text-left">Εγγραφή</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-300/60">
                {onboardingIncomplete.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-ink-500">
                      Όλες οι πρόσφατες επιχειρήσεις έχουν σύνδεση Wrapp.
                    </td>
                  </tr>
                )}
                {onboardingIncomplete.map((b) => (
                  <tr key={b.id} className="hover:bg-ink-100/40">
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/businesses/${b.id}`}
                        className="font-medium text-brand-700 hover:text-brand-800"
                      >
                        {b.legalName}
                      </Link>
                    </td>
                    <td className="px-4 py-2 mono text-xs">{b.vatNumber}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {b._count.documents}
                    </td>
                    <td className="px-4 py-2 text-ink-500 text-xs">
                      {b.createdAt.toLocaleString("el-GR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Πρόσφατες admin ενέργειες"
            subtitle="Filtered audit log (action prefix 'admin.')."
          />
          <CardBody className="p-0">
            <ul className="divide-y divide-ink-200 text-sm">
              {adminActions.length === 0 && (
                <li className="p-6 text-center text-ink-500">
                  Δεν έχουν καταγραφεί admin actions.
                </li>
              )}
              {adminActions.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="mono text-xs font-bold text-brand-800">
                      {a.action}
                    </p>
                    <p className="text-xs text-ink-500">
                      {a.userId ? (
                        <a
                          href={`/admin/users/${a.userId}`}
                          className="hover:text-brand-700"
                        >
                          user {a.userId.slice(-6)}
                        </a>
                      ) : (
                        "—"
                      )}
                      {a.entityType && (
                        <>
                          {" · "}
                          {a.entityType}
                        </>
                      )}
                    </p>
                  </div>
                  <span className="mono shrink-0 text-[10px] text-ink-400">
                    {a.createdAt.toLocaleString("el-GR")}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Wrapp API — top tenants (30 ημ.)"
            subtitle="Webhook hits ανά partner_user_id."
          />
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-2 text-left">partner_user_id</th>
                  <th className="px-4 py-2 text-right">Hits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-300/60">
                {wrappUsage.length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-6 text-center text-ink-500">
                      Δεν καταγράφηκαν webhook hits.
                    </td>
                  </tr>
                )}
                {wrappUsage.map((r) => (
                  <tr key={r.partnerUserId}>
                    <td className="px-4 py-2 mono text-xs text-ink-700">
                      {r.partnerUserId}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      <Badge tone="brand">
                        {Number(r.hits).toLocaleString("el-GR")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
