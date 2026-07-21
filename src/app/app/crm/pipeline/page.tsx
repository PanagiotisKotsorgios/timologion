import { ArrowLeft, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { money } from "@/lib/format";
import { OpportunityCard } from "../OpportunityCard";
import { OpportunityForm } from "../OpportunityForm";

export const dynamic = "force-dynamic";

const STAGES: {
  key: "discovery" | "proposal" | "negotiation" | "won" | "lost";
  label: string;
  color: string;
}[] = [
  { key: "discovery", label: "Discovery", color: "border-blue-400 bg-blue-50" },
  { key: "proposal", label: "Πρόταση", color: "border-amber-400 bg-amber-50" },
  { key: "negotiation", label: "Διαπραγμάτευση", color: "border-purple-400 bg-purple-50" },
  { key: "won", label: "Κερδισμένη", color: "border-green-500 bg-green-50" },
  { key: "lost", label: "Χαμένη", color: "border-red-400 bg-red-50" },
];

export default async function PipelinePage() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:read");

  const [opps, leads] = await Promise.all([
    prisma.opportunity.findMany({
      where: { businessId: ctx.businessId },
      orderBy: { updatedAt: "desc" },
      include: { lead: { select: { fullName: true, company: true } } },
    }),
    prisma.lead.findMany({
      where: { businessId: ctx.businessId, status: { not: "disqualified" } },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const byStage = STAGES.map((s) => ({
    ...s,
    items: opps.filter((o) => o.stage === s.key),
    total: opps
      .filter((o) => o.stage === s.key)
      .reduce((acc, o) => acc + Number(o.amount), 0),
  }));

  return (
    <>
      <PageHeader
        title="Pipeline Ευκαιριών"
        subtitle="Kanban view — σύρετε στάδια ή χρησιμοποιήστε τους ελέγχους σε κάθε κάρτα."
        actions={
          <LinkButton href="/app/crm" variant="secondary" icon={ArrowLeft}>
            Πίσω στο CRM
          </LinkButton>
        }
      />

      <div className="mb-6 grid gap-6 md:grid-cols-[1fr_360px]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {byStage.map((s) => (
            <div
              key={s.key}
              className={`rounded-2xl border-2 ${s.color} p-3`}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold text-brand-900">
                  {s.label}
                </p>
                <p className="text-xs font-bold text-brand-900">
                  {s.items.length}
                </p>
              </div>
              <p className="mb-3 text-xs text-ink-700">{money(s.total)}</p>
              <div className="space-y-2">
                {s.items.length === 0 && (
                  <p className="text-center text-xs text-ink-400">—</p>
                )}
                {s.items.map((o) => (
                  <OpportunityCard
                    key={o.id}
                    opportunity={{
                      id: o.id,
                      title: o.title,
                      amount: Number(o.amount),
                      probability: o.probability,
                      stage: o.stage,
                      leadName: o.lead?.fullName ?? null,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border-2 border-ink-200 bg-white p-4">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-brand-800" />
            <p className="text-lg font-bold text-brand-900">Νέα ευκαιρία</p>
          </div>
          <OpportunityForm leads={leads} />
        </div>
      </div>
    </>
  );
}
