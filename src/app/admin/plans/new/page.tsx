import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { PlanForm } from "../PlanForm";

export default async function NewPlanPage() {
  await requireAdmin("super_admin");
  return (
    <>
      <PageHeader
        title="Νέο πακέτο"
        subtitle="Ρύθμισε τιμή, όρια χρήσης και χαρακτηριστικά."
      />
      <Card>
        <CardBody className="p-6 md:p-8">
          <PlanForm />
        </CardBody>
      </Card>
    </>
  );
}
