import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BroadcastForm } from "./BroadcastForm";

export const dynamic = "force-dynamic";

export default async function AdminBroadcastsPage() {
  await requireAdmin("super_admin");

  const [history, segCounts] = await Promise.all([
    prisma.broadcast.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getSegmentCounts(),
  ]);

  return (
    <>
      <PageHeader
        title="Broadcast email"
        subtitle="Στείλε στοχευμένο email σε ομάδες χρηστών. Κάθε αποστολή καταγράφεται."
      />

      <Card className="mb-6">
        <CardHeader
          title="Νέο broadcast"
          subtitle="Δοκίμασε πρώτα σε dry-run — δεν στέλνει, μόνο δείχνει πόσοι θα πάρουν."
        />
        <CardBody>
          <BroadcastForm segmentCounts={segCounts} />
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title={`Ιστορικό (${history.length})`} />
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-2 text-left">Ημ/νία</th>
                  <th className="px-4 py-2 text-left">Segment</th>
                  <th className="px-4 py-2 text-left">Θέμα</th>
                  <th className="px-4 py-2 text-right">Παραλήπτες</th>
                  <th className="px-4 py-2 text-right">Sent / Failed</th>
                  <th className="px-4 py-2 text-left">Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-300/60">
                {history.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-ink-500">
                      Καμία αποστολή ακόμη.
                    </td>
                  </tr>
                )}
                {history.map((b) => (
                  <tr key={b.id} className="hover:bg-ink-100/40">
                    <td className="px-4 py-2 text-ink-500">
                      {b.createdAt.toLocaleString("el-GR")}
                    </td>
                    <td className="px-4 py-2 mono text-xs">{b.segment}</td>
                    <td className="px-4 py-2 max-w-md truncate" title={b.subject}>
                      {b.subject}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {b.recipients.toLocaleString("el-GR")}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      <span className="text-emerald-800 font-semibold">
                        {b.sent}
                      </span>
                      {b.failed > 0 && (
                        <span className="ml-2 text-red-800 font-semibold">
                          / {b.failed}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {b.dryRun ? (
                        <Badge tone="warning">dry-run</Badge>
                      ) : (
                        <Badge tone="success">sent</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </>
  );
}

async function getSegmentCounts(): Promise<Record<string, number>> {
  const [allUsers, ownersDistinct, adminUsers, activeSubs, freeUsers] =
    await Promise.all([
      prisma.user.count({
        where: { suspendedAt: null, emailVerifiedAt: { not: null } },
      }),
      prisma.businessMember.findMany({
        where: { role: "owner" },
        distinct: ["userId"],
        select: { userId: true },
      }),
      prisma.user.count({
        where: { platformRole: { not: null }, suspendedAt: null },
      }),
      prisma.businessSubscription.findMany({
        where: { status: { in: ["active", "trialing"] } },
        distinct: ["businessId"],
        select: { businessId: true },
      }),
      prisma.user.count({
        where: {
          suspendedAt: null,
          emailVerifiedAt: { not: null },
          memberships: {
            some: {
              business: {
                subscriptions: {
                  none: { status: { in: ["active", "trialing"] } },
                },
              },
            },
          },
        },
      }),
    ]);
  return {
    all_users: allUsers,
    owners: ownersDistinct.length,
    admins: adminUsers,
    paying_owners: activeSubs.length,
    free_users: freeUsers,
  };
}
