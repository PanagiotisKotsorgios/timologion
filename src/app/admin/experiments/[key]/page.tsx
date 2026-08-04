import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import {
  setExperimentStatusAction,
  deleteExperimentAction,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminExperimentDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  await requireAdmin("super_admin");
  const { key: keyRaw } = await params;
  const key = decodeURIComponent(keyRaw);

  const experiment = await prisma.experiment.findUnique({
    where: { key },
    include: { _count: { select: { events: true } } },
  });
  if (!experiment) notFound();

  // Group event counts by (variant, event) for a matrix.
  const groups = await prisma.experimentEvent.groupBy({
    by: ["variant", "event"],
    where: { experimentKey: key },
    _count: { _all: true },
    _sum: { value: true },
  });

  const eventNames = Array.from(new Set(groups.map((g) => g.event))).sort();
  const table = new Map<string, { A: number; B: number; sumA: number; sumB: number }>();
  for (const g of groups) {
    const row = table.get(g.event) ?? { A: 0, B: 0, sumA: 0, sumB: 0 };
    if (g.variant === "A") {
      row.A += g._count._all;
      row.sumA += Number(g._sum.value ?? 0);
    } else {
      row.B += g._count._all;
      row.sumB += Number(g._sum.value ?? 0);
    }
    table.set(g.event, row);
  }

  const assigned = table.get("assigned") ?? { A: 0, B: 0, sumA: 0, sumB: 0 };
  const totalA = assigned.A;
  const totalB = assigned.B;

  return (
    <>
      <PageHeader
        title={key}
        subtitle={experiment.description ?? "Χωρίς περιγραφή"}
        actions={
          <LinkButton href="/admin/experiments" variant="secondary" icon={ArrowLeft}>
            Πίσω
          </LinkButton>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Meta label="Status">
          <Badge
            tone={
              experiment.status === "running"
                ? "success"
                : experiment.status === "paused"
                  ? "warning"
                  : "muted"
            }
          >
            {experiment.status}
          </Badge>
        </Meta>
        <Meta label="Split">
          {experiment.variantAPct}% A · {100 - experiment.variantAPct}% B
        </Meta>
        <Meta label="Assigned A">{totalA.toLocaleString("el-GR")}</Meta>
        <Meta label="Assigned B">{totalB.toLocaleString("el-GR")}</Meta>
      </div>

      <Card className="mb-6">
        <CardHeader title="Έλεγχοι" />
        <CardBody className="flex flex-wrap items-center gap-3">
          {(["draft", "running", "paused", "completed"] as const).map((s) => (
            <form key={s} action={setExperimentStatusAction}>
              <input type="hidden" name="key" value={key} />
              <input type="hidden" name="status" value={s} />
              <button
                type="submit"
                disabled={experiment.status === s}
                className={
                  "inline-flex h-9 items-center rounded-md border-2 px-3 text-xs font-bold " +
                  (experiment.status === s
                    ? "border-brand-800 bg-brand-700 text-white cursor-default"
                    : "border-ink-300 bg-white text-ink-900 hover:border-ink-500")
                }
              >
                {s}
              </button>
            </form>
          ))}
          <span className="flex-1" />
          <form action={deleteExperimentAction}>
            <input type="hidden" name="key" value={key} />
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md border-2 border-red-700 bg-white px-3 text-xs font-bold text-red-700 hover:bg-red-50"
            >
              Διαγραφή
            </button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Metrics"
          subtitle="Καταμέτρηση events + conversion rate ανά variant."
        />
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-2 text-left">Event</th>
                <th className="px-4 py-2 text-right">A count</th>
                <th className="px-4 py-2 text-right">A conv%</th>
                <th className="px-4 py-2 text-right">B count</th>
                <th className="px-4 py-2 text-right">B conv%</th>
                <th className="px-4 py-2 text-right">Δ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-300/60">
              {eventNames.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-ink-500">
                    Δεν υπάρχουν events ακόμη. Fire με trackExperimentEvent().
                  </td>
                </tr>
              )}
              {eventNames.map((ev) => {
                const r = table.get(ev)!;
                const rateA = totalA > 0 ? (r.A / totalA) * 100 : 0;
                const rateB = totalB > 0 ? (r.B / totalB) * 100 : 0;
                const delta = rateB - rateA;
                return (
                  <tr key={ev}>
                    <td className="px-4 py-2 mono text-xs">{ev}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {r.A.toLocaleString("el-GR")}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-ink-500">
                      {rateA.toFixed(1)}%
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {r.B.toLocaleString("el-GR")}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-ink-500">
                      {rateB.toFixed(1)}%
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-bold">
                      <span
                        className={
                          delta > 0
                            ? "text-emerald-700"
                            : delta < 0
                              ? "text-red-700"
                              : "text-ink-500"
                        }
                      >
                        {delta > 0 ? "+" : ""}
                        {delta.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {experiment.hypothesis && (
        <Card className="mt-6">
          <CardHeader title="Hypothesis" />
          <CardBody>
            <p className="whitespace-pre-wrap text-sm text-ink-900">
              {experiment.hypothesis}
            </p>
          </CardBody>
        </Card>
      )}
    </>
  );
}

function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border-2 border-ink-300 bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-ink-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-ink-900">{children}</p>
    </div>
  );
}
