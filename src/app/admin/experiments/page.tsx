import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CreateExperimentForm } from "./CreateExperimentForm";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<
  string,
  "success" | "warning" | "muted" | "brand"
> = {
  draft: "muted",
  running: "success",
  paused: "warning",
  completed: "brand",
};

export default async function AdminExperimentsPage() {
  await requireAdmin("super_admin");

  const experiments = await prisma.experiment.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { events: true } } },
  });

  return (
    <>
      <PageHeader
        title="A/B experiments"
        subtitle="Deterministic 50/50 assignment ανά επιχείρηση με event tracking."
      />

      <Card className="mb-6">
        <CardHeader
          title="Νέο experiment"
          subtitle="Key = προγραμματιστικό αναγνωριστικό (πεζά + underscores)."
        />
        <CardBody>
          <CreateExperimentForm />
        </CardBody>
      </Card>

      <div className="space-y-4">
        {experiments.length === 0 && (
          <Card>
            <CardBody className="text-center text-sm text-ink-500">
              Δεν έχει οριστεί experiment ακόμη.
            </CardBody>
          </Card>
        )}
        {experiments.map((e) => (
          <Card key={e.key}>
            <CardHeader
              title={
                <span className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/experiments/${encodeURIComponent(e.key)}`}
                    className="mono font-black text-brand-900 hover:text-brand-950"
                  >
                    {e.key}
                  </Link>
                  <Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge>
                  <Badge tone="neutral">A={e.variantAPct}% · B={100 - e.variantAPct}%</Badge>
                  <Badge tone="muted">
                    {e._count.events.toLocaleString("el-GR")} events
                  </Badge>
                </span>
              }
              subtitle={e.description ?? ""}
              action={
                <Link
                  href={`/admin/experiments/${encodeURIComponent(e.key)}`}
                  className="text-xs font-bold text-brand-800 hover:text-brand-900"
                >
                  Metrics →
                </Link>
              }
            />
          </Card>
        ))}
      </div>
    </>
  );
}
