import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { BusinessSettingsForm } from "./BusinessSettingsForm";

export default async function BusinessSettingsPage() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "business:update");

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: ctx.businessId },
  });

  return (
    <>
      <PageHeader
        title="Στοιχεία επιχείρησης"
        subtitle="Ενημέρωσε ΑΦΜ, επωνυμία, ΔΟΥ και επαφή."
      />
      <Card>
        <CardBody>
          <BusinessSettingsForm initial={business} />
        </CardBody>
      </Card>
    </>
  );
}
