"use client";

import { useActionState, useTransition } from "react";
import { Save, Send, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import {
  saveEmailSettingsAction,
  sendTestEmailAction,
  clearEmailApiKeyAction,
  type EmailSettingsState,
} from "./actions";

export function ConfigForm({
  initial,
}: {
  initial: {
    hasApiKey: boolean;
    senderEmail: string;
    senderName: string;
    replyTo: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState<
    EmailSettingsState,
    FormData
  >(saveEmailSettingsAction, undefined);
  const [clearing, startClear] = useTransition();

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}

      <Field
        label="Brevo API key"
        htmlFor="apiKey"
        hint={
          initial.hasApiKey
            ? "Άφησέ το κενό για να διατηρήσεις το τρέχον API key."
            : "Δημιούργησέ ένα από το Brevo → SMTP & API → API Keys."
        }
      >
        <Input
          id="apiKey"
          name="apiKey"
          type="password"
          autoComplete="new-password"
          placeholder={
            initial.hasApiKey ? "•••• (ήδη αποθηκευμένο)" : "xkeysib-..."
          }
          maxLength={255}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Email αποστολέα" htmlFor="senderEmail">
          <Input
            id="senderEmail"
            name="senderEmail"
            type="email"
            defaultValue={initial.senderEmail}
            required
            placeholder="noreply@timologion.gr"
          />
        </Field>
        <Field label="Όνομα αποστολέα" htmlFor="senderName">
          <Input
            id="senderName"
            name="senderName"
            defaultValue={initial.senderName}
            required
            maxLength={120}
            placeholder="timologion"
          />
        </Field>
      </div>

      <Field
        label="Reply-To (προαιρετικά)"
        htmlFor="replyTo"
        hint="Απαντήσεις χρηστών προωθούνται εδώ."
      >
        <Input
          id="replyTo"
          name="replyTo"
          type="email"
          defaultValue={initial.replyTo ?? ""}
          placeholder="support@timologion.gr"
        />
      </Field>

      <div className="flex items-center justify-between gap-3 border-t-2 border-ink-300/60 pt-6">
        {initial.hasApiKey ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={Trash2}
            disabled={clearing}
            onClick={() =>
              startClear(async () => {
                await clearEmailApiKeyAction();
              })
            }
          >
            {clearing ? "Διαγραφή..." : "Διαγραφή API key"}
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" size="lg" disabled={pending} icon={Save}>
          {pending ? "Αποθήκευση..." : "Αποθήκευση"}
        </Button>
      </div>
    </form>
  );
}

export function TestForm() {
  const [state, formAction, pending] = useActionState<
    EmailSettingsState,
    FormData
  >(sendTestEmailAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}

      <Field label="Παραλήπτης" htmlFor="to">
        <Input
          id="to"
          name="to"
          type="email"
          required
          placeholder="you@example.gr"
        />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} icon={Send}>
          {pending ? "Αποστολή..." : "Αποστολή δοκιμαστικού"}
        </Button>
      </div>
    </form>
  );
}
