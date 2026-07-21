import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { getEmailConfig } from "@/lib/email/config";
import { date } from "@/lib/format";
import { ConfigForm, TestForm } from "./EmailForms";

export const dynamic = "force-dynamic";

export default async function AdminEmailPage() {
  await requireAdmin("super_admin");
  const cfg = await getEmailConfig();

  return (
    <>
      <PageHeader
        title="Ρυθμίσεις Email (Brevo)"
        subtitle="Ρύθμισε την υπηρεσία transactional email που χρησιμοποιείται για επαναφορά κωδικού, τιμολόγηση και άλλες αυτόματες ειδοποιήσεις."
      />

      <Alert tone="info" title="Πώς λειτουργεί">
        Το API key της Brevo χρησιμοποιείται σε όλο το σύστημα για όλα τα emails
        που στέλνονται προς τους χρήστες. Αποθηκεύεται κρυπτογραφημένο (AES-256-GCM).
      </Alert>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader
            title="Παράμετροι σύνδεσης"
            action={
              cfg.hasApiKey ? (
                <Badge tone="success">Ενεργό</Badge>
              ) : (
                <Badge tone="muted">Δεν έχει ρυθμιστεί</Badge>
              )
            }
          />
          <CardBody>
            <ConfigForm
              initial={{
                hasApiKey: cfg.hasApiKey,
                senderEmail: cfg.senderEmail,
                senderName: cfg.senderName,
                replyTo: cfg.replyTo,
              }}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Δοκιμαστικό email"
            subtitle="Επιβεβαίωση ότι η αποστολή λειτουργεί."
          />
          <CardBody>
            <TestForm />
            <div className="mt-8 space-y-2 border-t-2 border-ink-300/60 pt-5 text-sm text-ink-900">
              <p className="font-semibold">Κατάσταση</p>
              <Row label="API key" value={cfg.hasApiKey ? "Ενεργό" : "—"} />
              <Row label="Αποστολέας" value={cfg.senderEmail} />
              <Row label="Όνομα" value={cfg.senderName} />
              <Row label="Reply-To" value={cfg.replyTo ?? "—"} />
              <Row
                label="Τελευταία επιτυχής αποστολή"
                value={cfg.lastVerifiedAt ? date(cfg.lastVerifiedAt) : "—"}
              />
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-ink-300/60 pb-2 last:border-b-0 last:pb-0">
      <span className="text-ink-700">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
