import Link from "next/link";
import {
  Users2,
  Target,
  CheckSquare,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CrmHome() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:read");

  const [leadsCount, openOpps, oppSum, openTasks] = await Promise.all([
    prisma.lead.count({
      where: { businessId: ctx.businessId, status: { in: ["new", "contacted"] } },
    }),
    prisma.opportunity.count({
      where: {
        businessId: ctx.businessId,
        stage: { notIn: ["won", "lost"] },
      },
    }),
    prisma.opportunity.aggregate({
      where: {
        businessId: ctx.businessId,
        stage: { notIn: ["won", "lost"] },
      },
      _sum: { amount: true },
    }),
    prisma.crmTask.count({
      where: { businessId: ctx.businessId, status: "open" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="CRM"
        subtitle="Leads, ευκαιρίες και εργασίες follow-up σε ένα σημείο."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Kpi label="Ανοιχτοί Leads" value={String(leadsCount)} />
        <Kpi label="Ενεργές ευκαιρίες" value={String(openOpps)} />
        <Kpi label="Pipeline value" value={money(oppSum._sum.amount ?? 0)} highlight />
        <Kpi label="Ανοιχτά tasks" value={String(openTasks)} />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <ModuleCard
          href="/app/crm/leads"
          title="Leads"
          desc="Νέες επαφές που δεν είναι ακόμη πελάτες."
          Icon={Users2}
        />
        <ModuleCard
          href="/app/crm/pipeline"
          title="Ευκαιρίες"
          desc="Kanban pipeline με στάδια discovery → won/lost."
          Icon={TrendingUp}
        />
        <ModuleCard
          href="/app/crm/tasks"
          title="Εργασίες"
          desc="Follow-up tasks, ημερομηνίες λήξης και υπενθυμίσεις."
          Icon={CheckSquare}
        />
      </div>
    </>
  );
}

function Kpi({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-bold uppercase tracking-widest text-ink-500">
          {label}
        </p>
        <p
          className={
            "mt-2 text-3xl font-extrabold " +
            (highlight ? "text-brand-900" : "text-ink-900")
          }
        >
          {value}
        </p>
      </CardBody>
    </Card>
  );
}

function ModuleCard({
  href,
  title,
  desc,
  Icon,
}: {
  href: string;
  title: string;
  desc: string;
  Icon: typeof Target;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border-2 border-ink-200 bg-white p-6 transition-colors hover:border-brand-700 hover:bg-brand-50"
    >
      <div className="flex items-start justify-between">
        <Icon size={28} className="text-brand-800" />
        <ChevronRight
          size={18}
          className="text-ink-400 transition-transform group-hover:translate-x-1"
        />
      </div>
      <p className="mt-4 text-xl font-bold text-brand-900">{title}</p>
      <p className="mt-1 text-sm text-ink-700">{desc}</p>
    </Link>
  );
}
