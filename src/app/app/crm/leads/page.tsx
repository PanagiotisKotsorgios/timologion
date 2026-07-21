import { Plus, Users2, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { date } from "@/lib/format";
import { LeadForm } from "../LeadForm";
import { LeadStatusSelect } from "../LeadStatusSelect";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  new: "Νέος",
  contacted: "Επαφή",
  qualified: "Καταλληλος",
  disqualified: "Απορρίφθηκε",
  converted: "Πελάτης",
};
const STATUS_TONE: Record<
  string,
  "brand" | "success" | "muted" | "warning" | "neutral"
> = {
  new: "brand",
  contacted: "warning",
  qualified: "success",
  disqualified: "muted",
  converted: "success",
};

export default async function LeadsPage() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:read");

  const leads = await prisma.lead.findMany({
    where: { businessId: ctx.businessId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="Δυνητικοί πελάτες προς follow-up."
        actions={
          <LinkButton
            href="/app/crm"
            variant="secondary"
            icon={ArrowLeft}
          >
            Πίσω στο CRM
          </LinkButton>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <Card>
          <CardBody className="p-0">
            {leads.length === 0 ? (
              <div className="p-8 text-center">
                <Users2 className="mx-auto text-ink-400" size={40} />
                <p className="mt-3 text-sm text-ink-500">
                  Δεν υπάρχουν leads ακόμη.
                </p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ονοματεπώνυμο</th>
                    <th>Εταιρεία</th>
                    <th>Επικοινωνία</th>
                    <th>Πηγή</th>
                    <th>Κατάσταση</th>
                    <th>Ημ/νία</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <p className="font-semibold text-brand-900">
                          {l.fullName}
                        </p>
                        {l.notes && (
                          <p className="text-xs text-ink-500 line-clamp-1">
                            {l.notes}
                          </p>
                        )}
                      </td>
                      <td>{l.company ?? "—"}</td>
                      <td className="text-sm">
                        {l.email && <div>{l.email}</div>}
                        {l.phone && <div>{l.phone}</div>}
                        {!l.email && !l.phone && "—"}
                      </td>
                      <td>{l.source ?? "—"}</td>
                      <td>
                        <LeadStatusSelect
                          id={l.id}
                          current={l.status}
                          label={STATUS_LABEL[l.status] ?? l.status}
                          tone={STATUS_TONE[l.status] ?? "neutral"}
                        />
                      </td>
                      <td className="mono text-xs">{date(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="mb-4 flex items-center gap-2">
              <Plus size={18} className="text-brand-800" />
              <p className="text-lg font-bold text-brand-900">Νέος Lead</p>
            </div>
            <LeadForm />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
