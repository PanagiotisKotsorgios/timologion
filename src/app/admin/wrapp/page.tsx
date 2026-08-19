import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import {
  getWrappSettingsForForm,
  classifyBaseUrl,
} from "@/lib/wrapp/settings";
import { env } from "@/lib/env";
import { WrappSettingsForm } from "./WrappSettingsForm";
import { EnvironmentSwitcher } from "./EnvironmentSwitcher";
import { enterAsStagingQaUserAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminWrappPage() {
  await requireAdmin("super_admin");
  const cfg = await getWrappSettingsForForm();

  const partnerConfigured = cfg.partnerApiKeySet || cfg.fallbackFromEnv.partnerApiKey;

  // Cross-check the effective Wrapp environment against Node's own env.
  // production+staging or the reverse are the two situations we want to
  // shout about — the former ships fake MARKs to a real tenant, the
  // latter mints a real Wrapp charge from a dev instance.
  const wrappEnv = classifyBaseUrl(cfg.baseUrl);
  const nodeEnv = env.NODE_ENV;
  const envMismatch =
    (nodeEnv === "production" && wrappEnv === "staging") ||
    (nodeEnv !== "production" && wrappEnv === "production");

  return (
    <>
      <PageHeader
        title="Ρυθμίσεις Wrapp"
        subtitle="Κεντρικές ρυθμίσεις για την ενσωμάτωση με τον πάροχο ηλεκτρονικής τιμολόγησης Wrapp."
      />

      {envMismatch && (
        <Alert tone="danger" title="Ασυμφωνία περιβάλλοντος">
          Το NODE_ENV είναι <strong>{nodeEnv}</strong> αλλά το ενεργό Wrapp URL
          είναι <strong>{wrappEnv === "production" ? "παραγωγικό" : "staging"}</strong>.
          {nodeEnv === "production"
            ? " Ένας πραγματικός τενάντας μπορεί να λάβει staging MARK — άλλαξε άμεσα σε production παρακάτω."
            : " Μη-παραγωγικά περιβάλλοντα δεν πρέπει να χρεώνουν πραγματική έκδοση — γύρισε πίσω σε staging."}
        </Alert>
      )}

      <Alert tone="info" title="Πώς λειτουργεί">
        Τα ευαίσθητα κλειδιά αποθηκεύονται κρυπτογραφημένα (AES-256-GCM) στη βάση
        δεδομένων. Οι αλλαγές ενεργοποιούνται άμεσα, χωρίς restart. Αν κάτι
        αφεθεί κενό εδώ, χρησιμοποιείται η αντίστοιχη μεταβλητή περιβάλλοντος
        ως fallback.
      </Alert>

      <div className="mt-6">
        <EnvironmentSwitcher current={wrappEnv} baseUrl={cfg.baseUrl} />
      </div>

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
              stagingPartnerApiKeySet={cfg.stagingPartnerApiKeySet}
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
            <CardHeader title="Λειτουργία δοκιμών (staging)" />
            <CardBody className="space-y-3 text-sm">
              <p className="text-ink-700">
                Πάτα το κουμπί για να μπεις σε staging mode: όλες οι κλήσεις
                στη Wrapp από τον <strong>δικό σου browser</strong> θα φτάνουν
                στο{" "}
                <code className="mono text-xs">staging.wrapp.ai</code>. Οι
                άλλοι χρήστες δεν επηρεάζονται.
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="/staging"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border-2 border-amber-600 bg-amber-500 px-3 text-sm font-bold text-white hover:bg-amber-600"
                >
                  Μπες σε staging →
                </a>
                <a
                  href="/staging/exit"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border-2 border-ink-300 bg-white px-3 text-xs font-bold text-ink-800 hover:bg-ink-50"
                >
                  Έξοδος
                </a>
              </div>

              {/* One-click "run through the app as a fresh user, in
                  staging". Ensures a dedicated staging-qa@ account +
                  business exist (creating them on first click), flips
                  the admin's session to that user, and sets the
                  staging cookie. Everything the admin does then is
                  isolated from real tenant data. Restore via the
                  standard "Επιστροφή στο admin" flow. */}
              <div className="rounded-lg border-2 border-dashed border-ink-300 bg-ink-50 p-3">
                <p className="text-xs font-bold text-ink-900">
                  Δοκιμή ως staging user
                </p>
                <p className="mt-1 text-xs text-ink-700">
                  Είσοδος σαν αποκλειστικό QA user σε staging mode —
                  δοκίμασε ολόκληρη τη ροή (onboarding → ενεργοποίηση →
                  έκδοση παραστατικών) χωρίς να ακουμπάς πραγματικά
                  δεδομένα. Επαναχρησιμοποιείται ο ίδιος λογαριασμός
                  σε κάθε κλικ.
                </p>
                <form action={enterAsStagingQaUserAction} className="mt-2">
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center gap-2 rounded-md border-2 border-brand-800 bg-brand-700 px-3 text-xs font-bold text-white hover:bg-brand-800"
                  >
                    Είσοδος ως staging user →
                  </button>
                </form>
              </div>

              <p className="text-xs text-ink-500">
                Ρύθμισε ξεχωριστό «Partner API key (staging)» στα δεξιά αν
                δεν το έχεις ήδη — αλλιώς οι κλήσεις staging θα σκάσουν με 401.
              </p>
            </CardBody>
          </Card>

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
                value={
                  wrappEnv === "production"
                    ? "Production"
                    : wrappEnv === "staging"
                      ? "Staging"
                      : "Custom"
                }
                tone={
                  wrappEnv === "production"
                    ? "success"
                    : wrappEnv === "staging"
                      ? "warning"
                      : "muted"
                }
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
