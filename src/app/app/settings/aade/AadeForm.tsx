"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { saveAadeCredentialsAction, type AadeState } from "./actions";

export function AadeForm({
  currentUsername,
  hasPassword,
}: {
  currentUsername: string | null;
  hasPassword: boolean;
}) {
  const [state, formAction, pending] = useActionState<AadeState, FormData>(
    saveAadeCredentialsAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}

      <Field
        label="Όνομα χρήστη ΓΓΠΣ / TAXISnet"
        htmlFor="aadeUsername"
        hint="Το username που έχεις στο myAADE / TAXISnet."
      >
        <Input
          id="aadeUsername"
          name="aadeUsername"
          type="text"
          required
          maxLength={120}
          autoComplete="username"
          defaultValue={currentUsername ?? ""}
          placeholder="username"
        />
      </Field>

      <Field
        label="Κωδικός ΓΓΠΣ"
        htmlFor="aadePassword"
        hint={
          hasPassword
            ? "Ο κωδικός είναι ήδη αποθηκευμένος. Άφησέ τον κενό αν δεν θέλεις να τον αλλάξεις."
            : "Ο κωδικός αποθηκεύεται κρυπτογραφημένος (AES-256-GCM)."
        }
      >
        <Input
          id="aadePassword"
          name="aadePassword"
          type="password"
          required={!hasPassword}
          maxLength={200}
          autoComplete="new-password"
          placeholder={hasPassword ? "••••••••••" : "Ο κωδικός σου"}
        />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Αποθήκευση..." : "Αποθήκευση"}
        </Button>
      </div>
    </form>
  );
}
