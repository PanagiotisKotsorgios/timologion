import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import { SupplierForm } from "../SupplierForm";

export const dynamic = "force-dynamic";

export default async function NewSupplierPage() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "client:write");

  return (
    <>
      <PageHeader
        title="Νέος προμηθευτής"
        subtitle="Στοιχεία επιχείρησης — χρησιμοποιούνται σε όλα τα έξοδα."
        actions={
          <LinkButton
            href="/app/expenses/suppliers"
            variant="secondary"
            icon={ArrowLeft}
          >
            Πίσω
          </LinkButton>
        }
      />
      <Card>
        <CardBody>
          <SupplierForm mode="create" />
        </CardBody>
      </Card>
    </>
  );
}
