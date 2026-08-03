import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 60;

type SearchParams = { job?: string; status?: string };

export default async function AdminCronPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin("super_admin", "support");
  const { job, status } = await searchParams;

  const where = {
    ...(job ? { jobKey: job } : {}),
    ...(status ? { status: status as "success" } : {}),
  };

  const [runs, jobs, lastPerJob] = await Promise.all([
    prisma.cronRun.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.cronRun.groupBy({
      by: ["jobKey"],
      _count: { _all: true },
      orderBy: { _count: { jobKey: "desc" } },
    }),
    prisma.$queryRawUnsafe<
      Array<{ jobKey: string; lastStart: Date; lastStatus: string }>
    >(
      `SELECT cr1.jobKey,
              cr1.startedAt AS lastStart,
              cr1.status    AS lastStatus
       FROM cron_runs cr1
       INNER JOIN (
         SELECT jobKey, MAX(startedAt) AS maxStart
         FROM cron_runs
         GROUP BY jobKey
       ) cr2
       ON cr1.jobKey = cr2.jobKey AND cr1.startedAt = cr2.maxStart`,
    ),
  ]);

  return (
    <>
      <PageHeader
        title="Cron runs"
        subtitle="Ιστορικό εκτελέσεων όλων των scheduled jobs."
      />

      <Card className="mb-6">
        <CardHeader title="Ανά job" />
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-2 text-left">Job</th>
                <th className="px-4 py-2 text-right">Συνολικά runs</th>
                <th className="px-4 py-2 text-left">Τελευταία εκτέλεση</th>
                <th className="px-4 py-2 text-left">Κατάσταση</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-300/60">
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-ink-500">
                    Δεν έχει τρέξει κανένα cron job ακόμη.
                  </td>
                </tr>
              )}
              {jobs.map((j) => {
                const last = lastPerJob.find((l) => l.jobKey === j.jobKey);
                return (
                  <tr key={j.jobKey}>
                    <td className="px-4 py-2 mono text-xs font-bold text-brand-900">
                      <a
                        href={`/admin/cron?job=${encodeURIComponent(j.jobKey)}`}
                        className="hover:underline"
                      >
                        {j.jobKey}
                      </a>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {j._count._all.toLocaleString("el-GR")}
                    </td>
                    <td className="px-4 py-2 text-ink-500">
                      {last?.lastStart
                        ? new Date(last.lastStart).toLocaleString("el-GR")
                        : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {last && (
                        <Badge
                          tone={
                            last.lastStatus === "success"
                              ? "success"
                              : last.lastStatus === "failed"
                                ? "danger"
                                : "warning"
                          }
                        >
                          {last.lastStatus}
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader
          title={`Τελευταία runs (${runs.length})`}
          subtitle={job ? `Φίλτρο: job=${job}` : ""}
        />
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-2 text-left">Ξεκίνησε</th>
                  <th className="px-4 py-2 text-left">Job</th>
                  <th className="px-4 py-2 text-left">Κατάσταση</th>
                  <th className="px-4 py-2 text-right">Είδη</th>
                  <th className="px-4 py-2 text-right">Διάρκεια</th>
                  <th className="px-4 py-2 text-left">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-300/60">
                {runs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-ink-500">
                      Δεν βρέθηκαν runs.
                    </td>
                  </tr>
                )}
                {runs.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-ink-100/40">
                    <td className="px-4 py-2 whitespace-nowrap text-ink-500">
                      {r.startedAt.toLocaleString("el-GR")}
                    </td>
                    <td className="px-4 py-2 mono text-xs">{r.jobKey}</td>
                    <td className="px-4 py-2">
                      <Badge
                        tone={
                          r.status === "success"
                            ? "success"
                            : r.status === "failed"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {r.itemsDone.toLocaleString("el-GR")}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-ink-700">
                      {r.durationMs > 0
                        ? `${(r.durationMs / 1000).toFixed(1)}s`
                        : "—"}
                    </td>
                    <td className="px-4 py-2 max-w-md truncate text-red-800" title={r.error ?? ""}>
                      {r.error ?? "—"}
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
