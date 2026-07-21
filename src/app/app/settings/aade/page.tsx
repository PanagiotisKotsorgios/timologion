import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { assertCan } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { date } from "@/lib/format";
import { AadeForm } from "./AadeForm";
import { clearAadeCredentialsAction } from "./actions";

export default async function AadeSettingsPage() {
  const ctx = await requireTenant();
  assertCan(ctx.role, "business:update");

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: ctx.businessId },
    select: {
      aadeUsername: true,
      aadePasswordEnc: true,
      aadeVerifiedAt: true,
    },
  });

  const active = Boolean(business.aadeUsername && business.aadePasswordEnc);

  return (
    <>
      <PageHeader
        title="ΓΓΠΣ / AADE — Αναζήτηση ΑΦΜ"
        subtitle="Σύνδεσε τον λογαριασμό σου με τη ΓΓΠΣ για να χρησιμοποιείς την αυτόματη αναζήτηση ΑΦΜ στους πελάτες σου."
      />

      <div className="mb-6">
        <Alert tone="warning" title="Σύντομα διαθέσιμο">
          Η αυτόματη αναζήτηση μέσω ΓΓΠΣ βρίσκεται σε φάση ολοκλήρωσης. Μπορείς
          ήδη να αποθηκεύσεις τα διαπιστευτήριά σου και θα ενεργοποιηθούν
          αυτόματα μόλις η σύνδεση με το AADE webservice τεθεί σε παραγωγή.
          Εν τω μεταξύ, η αναζήτηση ΑΦΜ γίνεται μέσω του πάροχου ηλεκτρονικής
          τιμολόγησης.
        </Alert>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader
            title="Διαπιστευτήρια ΓΓΠΣ"
            subtitle="Χρησιμοποιούνται μόνο για κλήσεις προς το AADE ΑΦΜ webservice."
            action={
              active ? (
                <Badge tone="success">Ενεργό</Badge>
              ) : (
                <Badge tone="muted">Δεν έχει ρυθμιστεί</Badge>
              )
            }
          />
          <CardBody>
            <AadeForm
              currentUsername={business.aadeUsername ?? null}
              hasPassword={Boolean(business.aadePasswordEnc)}
            />
            {active && (
              <div className="mt-8 border-t-2 border-ink-300/60 pt-6">
                <form action={clearAadeCredentialsAction}>
                  <Button type="submit" variant="secondary" size="sm">
                    Διαγραφή αποθηκευμένων διαπιστευτηρίων
                  </Button>
                </form>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Πληροφορίες" />
            <CardBody className="space-y-4 text-sm text-ink-900">
              <Row
                label="Κατάσταση"
                value={active ? "Ενεργοποιημένη" : "Απενεργοποιημένη"}
              />
              <Row
                label="Χρήστης"
                value={business.aadeUsername ?? "—"}
              />
              <Row
                label="Τελευταία αποθήκευση"
                value={
                  business.aadeVerifiedAt
                    ? date(business.aadeVerifiedAt)
                    : "—"
                }
              />
            </CardBody>
          </Card>

          <Alert tone="info" title="Ασφάλεια">
            Ο κωδικός σου αποθηκεύεται κρυπτογραφημένος με AES-256-GCM.
            Χρησιμοποιείται μόνο κατά την αναζήτηση ΑΦΜ από την εφαρμογή και
            δεν εμφανίζεται ποτέ στη διεπαφή.
          </Alert>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-ink-300/60 pb-3 last:border-b-0 last:pb-0">
      <span className="text-ink-700">{label}</span>
      <span className="font-semibold text-ink-900">{value}</span>
    </div>
  );
}
