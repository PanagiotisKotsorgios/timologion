import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { ClientForm } from "../ClientForm";

export default async function NewClientPage() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:write");

  return (
    <>
      <PageHeader
        title="Νέος πελάτης"
        subtitle="Ξεκίνα με αναζήτηση ΑΦΜ για γρήγορη συμπλήρωση."
      />
      <Card>
        <CardBody>
          <ClientForm mode="create" />
        </CardBody>
      </Card>
    </>
  );
}
