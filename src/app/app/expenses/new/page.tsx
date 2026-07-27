import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import { ExpenseForm } from "../ExpenseForm";

export const dynamic = "force-dynamic";

export default async function NewExpensePage() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "document:write");

  const suppliers = await prisma.supplier.findMany({
    where: { businessId: ctx.businessId },
    orderBy: { legalName: "asc" },
    select: { id: true, legalName: true },
  });

  return (
    <>
      <PageHeader
        title="Νέο έξοδο"
        subtitle="Καταχώρησε τιμολόγιο ή απόδειξη προμηθευτή."
        actions={
          <LinkButton
            href="/app/expenses"
            variant="secondary"
            icon={ArrowLeft}
          >
            Πίσω
          </LinkButton>
        }
      />
      <Card>
        <CardBody>
          <ExpenseForm mode="create" suppliers={suppliers} />
        </CardBody>
      </Card>
    </>
  );
}
