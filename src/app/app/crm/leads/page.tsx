import { Users2, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { NewLeadButton } from "../NewLeadButton";
import { LeadsTable } from "./LeadsTable";
import type { LeadDetail } from "./LeadDetailPopup";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:read");

  const leads = await prisma.lead.findMany({
    where: { businessId: ctx.businessId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const rows: LeadDetail[] = leads.map((l) => ({
    id: l.id,
    fullName: l.fullName,
    email: l.email,
    phone: l.phone,
    company: l.company,
    source: l.source,
    status: l.status,
    notes: l.notes,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  }));

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="Δυνητικοί πελάτες προς follow-up."
        actions={
          <>
            <LinkButton href="/app/crm" variant="secondary" icon={ArrowLeft}>
              Πίσω στο CRM
            </LinkButton>
            <NewLeadButton />
          </>
        }
      />

      <Card>
        <CardBody className="p-0">
          {rows.length === 0 ? (
            <div className="p-8 text-center">
              <Users2 className="mx-auto text-ink-400" size={40} />
              <p className="mt-3 text-sm text-ink-500">
                Δεν υπάρχουν leads ακόμη.
              </p>
            </div>
          ) : (
            <LeadsTable leads={rows} />
          )}
        </CardBody>
      </Card>
    </>
  );
}
