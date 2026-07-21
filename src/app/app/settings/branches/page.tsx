import { Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { BranchForm } from "./BranchForm";
import { deleteBranchAction } from "./actions";

export default async function BranchesPage() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "business:update");

  const branches = await prisma.branch.findMany({
    where: { businessId: ctx.businessId },
    orderBy: [{ isDefault: "desc" }, { label: "asc" }],
  });

  return (
    <>
      <PageHeader
        title="Υποκαταστήματα"
        subtitle="Διαχείριση σημείων δραστηριότητας. Θα συνδεθούν με τις σειρές παραστατικών."
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          {branches.length === 0 ? (
            <Card>
              <CardBody>
                <EmptyState
                  title="Δεν έχεις υποκαταστήματα."
                  description="Πρόσθεσε το πρώτο για να ξεκινήσεις."
                />
              </CardBody>
            </Card>
          ) : (
            branches.map((b) => (
              <Card key={b.id}>
                <CardHeader
                  title={
                    <span className="flex items-center gap-2">
                      {b.label}
                      {b.isDefault && <Badge tone="brand">Προεπιλογή</Badge>}
                    </span>
                  }
                  subtitle={[b.addressLine, b.postalCode, b.city]
                    .filter(Boolean)
                    .join(", ")}
                  action={
                    <form action={deleteBranchAction}>
                      <input type="hidden" name="id" value={b.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                      >
                        Διαγραφή
                      </Button>
                    </form>
                  }
                />
                <CardBody>
                  <BranchForm initial={b} />
                </CardBody>
              </Card>
            ))
          )}
        </div>

        <Card>
          <CardHeader title="Νέο υποκατάστημα" />
          <CardBody>
            <BranchForm />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
