import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { PlanForm } from "../PlanForm";

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin("super_admin");
  const { id } = await params;
  const plan = await prisma.platformPlan.findUnique({ where: { id } });
  if (!plan) notFound();

  return (
    <>
      <PageHeader title="Επεξεργασία πακέτου" subtitle={plan.name} />
      <Card>
        <CardBody className="p-6 md:p-8">
          <PlanForm
            initial={{
              id: plan.id,
              code: plan.code,
              name: plan.name,
              description: plan.description,
              priceMonthly: plan.priceMonthly.toString(),
              priceYearly: plan.priceYearly.toString(),
              includedDocsMonth: plan.includedDocsMonth,
              features: plan.features,
              active: plan.active,
              sortOrder: plan.sortOrder,
            }}
          />
        </CardBody>
      </Card>
    </>
  );
}
