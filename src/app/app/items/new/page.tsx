import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { ItemForm } from "../ItemForm";

export default async function NewItemPage() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "item:write");

  return (
    <>
      <PageHeader title="Νέο είδος ή υπηρεσία" />
      <Card>
        <CardBody>
          <ItemForm mode="create" />
        </CardBody>
      </Card>
    </>
  );
}
