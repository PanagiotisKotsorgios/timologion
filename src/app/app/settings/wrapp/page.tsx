import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { t } from "@/lib/i18n";
import { date } from "@/lib/format";
import { refreshWrappStatusAction } from "./actions";

export default async function WrappSettingsPage() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "wrapp:manage");

  const wrapp = await prisma.wrappConnection.findUnique({
    where: { businessId: ctx.businessId },
  });

  const status = wrapp?.status ?? "inactive";

  return (
    <>
      <PageHeader
        title="Σύνδεση με πάροχο myDATA"
        subtitle="Ρύθμισε την υπηρεσία ηλεκτρονικής έκδοσης παραστατικών."
      />

      <div className="space-y-6">
        <Alert tone="info" title="Θέση παρόχου">
          {t.brand.providerNote} Η υπογραφή σύμβασης και η συνδρομή του παρόχου
          εξοφλούνται απευθείας στον πάροχο, ξεχωριστά από τη συνδρομή του
          timologion.
        </Alert>

        <Card>
          <CardHeader
            title="Κατάσταση"
            subtitle="Ενημέρωση μέσω της Wrapp API"
            action={<StatusBadge status={status} />}
          />
          <CardBody className="space-y-3">
            <Row label="Wrapp user ID" value={wrapp?.wrappUserId ?? "—"} />
            <Row
              label="Ενεργό πρόγραμμα"
              value={wrapp?.hasPlan ? t.common.yes : t.common.no}
            />
            <Row
              label="Άδεια έκδοσης"
              value={wrapp?.canIssueInvoice ? t.common.yes : t.common.no}
            />
            <Row
              label="Τελευταία επιβεβαίωση"
              value={wrapp?.lastVerifiedAt ? date(wrapp.lastVerifiedAt) : "—"}
            />
            {wrapp?.lastError && (
              <Alert tone="danger">{wrapp.lastError}</Alert>
            )}
            <form action={refreshWrappStatusAction} className="pt-2">
              <Button type="submit" variant="secondary">
                Ανανέωση κατάστασης
              </Button>
            </form>
            <p className="text-xs text-ink-500">
              Σε αυτή τη φάση η σύνδεση είναι σε προσομοίωση. Θα ενεργοποιηθεί
              πλήρως μετά τη σύνδεση με τη Wrapp API στο επόμενο milestone.
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
      return <Badge tone="success">{t.wrapp.active}</Badge>;
    case "pending":
      return <Badge tone="warning">{t.wrapp.pending}</Badge>;
    case "error":
      return <Badge tone="danger">{t.wrapp.error}</Badge>;
    default:
      return <Badge tone="muted">{t.wrapp.inactive}</Badge>;
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-300/60 pb-2 text-sm last:border-b-0 last:pb-0">
      <span className="text-ink-500">{label}</span>
      <span className="font-medium text-ink-900">{value}</span>
    </div>
  );
}
