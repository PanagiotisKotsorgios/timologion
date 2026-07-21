import { Save } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Field, Input } from "@/components/ui/Input";
import {
  APP_SETTING_CATALOG,
  loadAppSettings,
} from "@/lib/app-settings";
import { saveSystemSettingsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SystemSettingsPage() {
  await requireAdmin("super_admin");
  const values = await loadAppSettings();

  return (
    <>
      <PageHeader
        title="Ρυθμίσεις πλατφόρμας"
        subtitle="Παράμετροι που ισχύουν καθολικά για όλους τους χρήστες."
      />

      <Alert tone="warning" title="Προσοχή">
        Οι αλλαγές εφαρμόζονται άμεσα στην εφαρμογή. Οι τιμές που αφορούν όρια
        μπορεί να επηρεάσουν την τιμολόγηση.
      </Alert>

      <form action={saveSystemSettingsAction} className="mt-6 space-y-4">
        <Card>
          <CardHeader
            title="Παράμετροι"
            subtitle="Οι τιμές αποθηκεύονται στη βάση δεδομένων της πλατφόρμας."
          />
          <CardBody className="space-y-6">
            {APP_SETTING_CATALOG.map((cfg) => (
              <div
                key={cfg.key}
                className="border-b-2 border-ink-300/60 pb-6 last:border-b-0 last:pb-0"
              >
                {cfg.type === "boolean" ? (
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      name={cfg.key}
                      defaultChecked={values[cfg.key] === "true"}
                      className="mt-1 h-5 w-5 rounded border-2 border-ink-500 text-brand-700"
                    />
                    <span>
                      <span className="block text-base font-semibold text-ink-900">
                        {cfg.label}
                      </span>
                      <span className="mt-1 block text-sm text-ink-700">
                        {cfg.description}
                      </span>
                    </span>
                  </label>
                ) : (
                  <Field
                    label={cfg.label}
                    hint={cfg.description}
                    htmlFor={cfg.key}
                  >
                    <Input
                      id={cfg.key}
                      name={cfg.key}
                      defaultValue={values[cfg.key]}
                      type={cfg.type === "number" ? "number" : "text"}
                      step={cfg.type === "number" ? "0.01" : undefined}
                    />
                  </Field>
                )}
              </div>
            ))}

            <div className="flex justify-end pt-2">
              <Button type="submit" size="lg" icon={Save}>
                Αποθήκευση ρυθμίσεων
              </Button>
            </div>
          </CardBody>
        </Card>
      </form>
    </>
  );
}
