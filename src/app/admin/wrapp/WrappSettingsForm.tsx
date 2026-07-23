"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import {
  saveWrappSettingsAction,
  clearPartnerKeyAction,
  clearStagingTenantKeyAction,
  clearWebhookSecretAction,
  type WrappSettingsState,
} from "./actions";

export function WrappSettingsForm({
  baseUrl,
  partnerApiKeySet,
  stagingTenantApiKeySet,
  stagingTenantEmail,
  webhookSecretSet,
  partnerFromEnv,
  stagingFromEnv,
  webhookFromEnv,
}: {
  baseUrl: string;
  partnerApiKeySet: boolean;
  stagingTenantApiKeySet: boolean;
  stagingTenantEmail: string;
  webhookSecretSet: boolean;
  partnerFromEnv: boolean;
  stagingFromEnv: boolean;
  webhookFromEnv: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<WrappSettingsState, FormData>(
    saveWrappSettingsAction,
    undefined,
  );
  const [clearing, startClear] = useTransition();

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}

      <Field
        label="Base URL"
        htmlFor="baseUrl"
        hint="π.χ. https://staging.wrapp.ai/api/v1 για δοκιμές, https://wrapp.ai/api/v1 για production."
      >
        <Input
          id="baseUrl"
          name="baseUrl"
          type="url"
          required
          defaultValue={baseUrl}
          placeholder="https://staging.wrapp.ai/api/v1"
        />
      </Field>

      <SecretField
        id="partnerApiKey"
        label="Partner API key (X-PARTNER-API-KEY)"
        hint="Χρησιμοποιείται για external_login / embedded_check_user. Δόθηκε από τη Wrapp."
        set={partnerApiKeySet}
        fromEnv={partnerFromEnv}
        onClear={() =>
          startClear(async () => {
            await clearPartnerKeyAction();
            router.refresh();
          })
        }
        clearBusy={clearing}
      />

      <div className="border-t-2 border-ink-200 pt-6">
        <p className="text-sm font-bold uppercase tracking-widest text-ink-500">
          Staging fallback tenant
        </p>
        <p className="mt-1 text-sm text-ink-700">
          Όταν μια επιχείρηση δεν έχει ενεργοποιήσει ακόμη τη Wrapp μέσω
          external_login, ο client εκτελεί όλες τις κλήσεις με αυτόν τον
          κοινό λογαριασμό staging. Αφαίρεσέ τον σε production.
        </p>
      </div>

      <SecretField
        id="stagingTenantApiKey"
        label="Staging tenant API key"
        hint="Το tenant api_key που σου έχει δώσει η Wrapp για δοκιμές."
        set={stagingTenantApiKeySet}
        fromEnv={stagingFromEnv}
        onClear={() =>
          startClear(async () => {
            await clearStagingTenantKeyAction();
            router.refresh();
          })
        }
        clearBusy={clearing}
      />

      <Field
        label="Staging tenant email"
        htmlFor="stagingTenantEmail"
        hint="Το email που ταιριάζει στο staging tenant, π.χ. cs+xxx@wrapp.ai."
      >
        <Input
          id="stagingTenantEmail"
          name="stagingTenantEmail"
          type="email"
          defaultValue={stagingTenantEmail}
          placeholder="cs+fishbill@wrapp.ai"
        />
      </Field>

      <SecretField
        id="webhookSecret"
        label="Webhook secret (προαιρετικό)"
        hint="Επιπλέον κοινός κωδικός για την επαλήθευση HMAC. Αν αφεθεί κενό, χρησιμοποιείται μόνο το HMAC με το τεναντ api_key."
        set={webhookSecretSet}
        fromEnv={webhookFromEnv}
        onClear={() =>
          startClear(async () => {
            await clearWebhookSecretAction();
            router.refresh();
          })
        }
        clearBusy={clearing}
      />

      <div className="flex justify-end border-t-2 border-ink-200 pt-6">
        <Button type="submit" icon={Save} disabled={pending}>
          {pending ? "Αποθήκευση..." : "Αποθήκευση ρυθμίσεων"}
        </Button>
      </div>
    </form>
  );
}

function SecretField({
  id,
  label,
  hint,
  set,
  fromEnv,
  onClear,
  clearBusy,
}: {
  id: string;
  label: string;
  hint: string;
  set: boolean;
  fromEnv: boolean;
  onClear: () => void;
  clearBusy: boolean;
}) {
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <div className="flex gap-2">
        <Input
          id={id}
          name={id}
          type="password"
          autoComplete="off"
          placeholder={
            set
              ? "•••••••• (αποθηκευμένο — άφησε κενό για να μην αλλάξει)"
              : fromEnv
                ? "Χρησιμοποιείται τιμή από env — γράψε εδώ για override"
                : "Δεν έχει οριστεί"
          }
        />
        {set && (
          <Button
            type="button"
            variant="secondary"
            size="md"
            icon={Trash2}
            onClick={onClear}
            disabled={clearBusy}
          >
            Διαγραφή
          </Button>
        )}
      </div>
      {set && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-700">
          <ShieldCheck size={12} />
          Αποθηκευμένο κρυπτογραφημένα στη βάση.
        </p>
      )}
      {!set && fromEnv && (
        <p className="mt-1 text-xs text-ink-500">
          Χρησιμοποιείται τιμή από μεταβλητή περιβάλλοντος.
        </p>
      )}
    </Field>
  );
}
