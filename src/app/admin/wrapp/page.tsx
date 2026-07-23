import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { getWrappSettingsForForm } from "@/lib/wrapp/settings";
import { env } from "@/lib/env";
import { WrappSettingsForm } from "./WrappSettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminWrappPage() {
  await requireAdmin("super_admin");
  const cfg = await getWrappSettingsForForm();

  const partnerConfigured = cfg.partnerApiKeySet || cfg.fallbackFromEnv.partnerApiKey;

  return (
    <>
      <PageHeader
        title="Ρυθμίσεις Wrapp"
        subtitle="Κεντρικές ρυθμίσεις για την ενσωμάτωση με τον πάροχο ηλεκτρονικής τιμολόγησης Wrapp."
      />

      <Alert tone="info" title="Πώς λειτουργεί">
        Τα ευαίσθητα κλειδιά αποθηκεύονται κρυπτογραφημένα (AES-256-GCM) στη βάση
        δεδομένων. Οι αλλαγές ενεργοποιούνται άμεσα, χωρίς restart. Αν κάτι
        αφεθεί κενό εδώ, χρησιμοποιείται η αντίστοιχη μεταβλητή περιβάλλοντος
        ως fallback.
      </Alert>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Παράμετροι Wrapp"
            action={
              partnerConfigured ? (
                <Badge tone="success">Ενεργό</Badge>
              ) : (
                <Badge tone="muted">Δεν έχει ρυθμιστεί</Badge>
              )
            }
          />
          <CardBody>
            <WrappSettingsForm
              baseUrl={cfg.baseUrl}
              partnerApiKeySet={cfg.partnerApiKeySet}
              stagingTenantApiKeySet={cfg.stagingTenantApiKeySet}
              stagingTenantEmail={cfg.stagingTenantEmail}
              webhookSecretSet={cfg.webhookSecretSet}
              partnerFromEnv={cfg.fallbackFromEnv.partnerApiKey}
              stagingFromEnv={cfg.fallbackFromEnv.stagingTenantApiKey}
              webhookFromEnv={cfg.fallbackFromEnv.webhookSecret}
            />
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Endpoint webhook" />
            <CardBody className="space-y-3 text-sm">
              <p className="text-ink-700">
                Δώσε στη Wrapp αυτό το URL για την αποστολή webhooks:
              </p>
              <code className="block break-all rounded-lg border-2 border-ink-200 bg-ink-50 p-3 text-xs">
                {env.APP_BASE_URL.replace(/\/$/, "")}/api/wrapp/webhook
              </code>
              <p className="text-xs text-ink-500">
                Αυτό το endpoint δέχεται τα events issued-invoice,
                pos-payment, invoice-pdf, thermal-print-pdf, και τη
                onboarding-completion κλήση με το api_key του tenant.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Ισχύον περιβάλλον" />
            <CardBody className="space-y-2 text-sm">
              <Row
                label="Base URL"
                value={cfg.baseUrl.includes("staging") ? "Staging" : "Production"}
                tone={cfg.baseUrl.includes("staging") ? "warning" : "success"}
              />
              <Row
                label="Partner API key"
                value={cfg.partnerApiKeySet ? "Στη ΒΔ" : cfg.fallbackFromEnv.partnerApiKey ? "Από env" : "—"}
                tone={
                  cfg.partnerApiKeySet
                    ? "success"
                    : cfg.fallbackFromEnv.partnerApiKey
                      ? "brand"
                      : "danger"
                }
              />
              <Row
                label="Staging tenant"
                value={cfg.stagingTenantApiKeySet ? "Στη ΒΔ" : cfg.fallbackFromEnv.stagingTenantApiKey ? "Από env" : "—"}
                tone={
                  cfg.stagingTenantApiKeySet || cfg.fallbackFromEnv.stagingTenantApiKey
                    ? "success"
                    : "muted"
                }
              />
              <Row
                label="Webhook secret"
                value={cfg.webhookSecretSet ? "Στη ΒΔ" : cfg.fallbackFromEnv.webhookSecret ? "Από env" : "—"}
                tone={
                  cfg.webhookSecretSet || cfg.fallbackFromEnv.webhookSecret
                    ? "success"
                    : "muted"
                }
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "warning" | "danger" | "muted" | "brand";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-700">{label}</span>
      <Badge tone={tone}>{value}</Badge>
    </div>
  );
}
