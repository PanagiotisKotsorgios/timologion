"use client";

import { useActionState, useState } from "react";
import { Save, Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { PasswordField } from "@/components/ui/PasswordField";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import {
  updateFullNameAction,
  changePasswordAction,
  deleteAccountAction,
} from "./actions";

type FormState = { error?: string; success?: string } | undefined;

export function AccountForms({
  email,
  fullName,
  hasPassword,
  oauthProviders,
}: {
  email: string;
  fullName: string;
  hasPassword: boolean;
  oauthProviders: string[];
}) {
  return (
    <div className="space-y-8">
      <NameForm initial={fullName} email={email} />
      {hasPassword ? (
        <PasswordChangeForm />
      ) : oauthProviders.length > 0 ? (
        <Alert tone="info" title="Χωρίς κωδικό">
          Έχεις συνδεθεί μέσω{" "}
          {oauthProviders
            .map((p) => (p === "google" ? "Google" : "Facebook"))
            .join(" και ")}
          . Αν θέλεις κωδικό για είσοδο με email, χρησιμοποίησε την επιλογή
          «Ξέχασες τον κωδικό;» στη σελίδα σύνδεσης.
        </Alert>
      ) : null}
    </div>
  );
}

function NameForm({ initial, email }: { initial: string; email: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateFullNameAction,
    undefined,
  );
  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Email" htmlFor="email">
          <Input id="email" value={email} disabled />
        </Field>
        <Field label="Ονοματεπώνυμο" htmlFor="fullName">
          <Input
            id="fullName"
            name="fullName"
            required
            defaultValue={initial}
            maxLength={120}
          />
        </Field>
      </div>

      <div className="flex justify-end">
        <Button type="submit" icon={Save} disabled={pending}>
          {pending ? "Αποθήκευση..." : "Αποθήκευση"}
        </Button>
      </div>
    </form>
  );
}

function PasswordChangeForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    changePasswordAction,
    undefined,
  );
  const [next, setNext] = useState("");
  return (
    <form action={formAction} className="space-y-4 border-t-2 border-ink-200 pt-6">
      <div className="flex items-center gap-2">
        <Lock size={16} className="text-ink-500" />
        <p className="text-sm font-bold uppercase tracking-widest text-ink-500">
          Αλλαγή κωδικού
        </p>
      </div>
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}

      <Field label="Τρέχων κωδικός" htmlFor="current">
        <PasswordField
          id="current"
          name="current"
          autoComplete="current-password"
          required
        />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Νέος κωδικός" htmlFor="next">
          <PasswordField
            id="next"
            name="next"
            autoComplete="new-password"
            minLength={8}
            required
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <PasswordStrength value={next} />
        </Field>
        <Field label="Επιβεβαίωση" htmlFor="confirm">
          <PasswordField
            id="confirm"
            name="confirm"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" icon={Lock} disabled={pending}>
          {pending ? "Ενημέρωση..." : "Αλλαγή κωδικού"}
        </Button>
      </div>
    </form>
  );
}

function DeleteAccountForm({ hasPassword }: { hasPassword: boolean }) {
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(fd: FormData) {
    setError(null);
    const res = await deleteAccountAction(fd);
    if (res && "error" in res && res.error) setError(res.error);
  }

  const disabled = confirm.trim() !== "ΔΙΑΓΡΑΦΗ";

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && <Alert tone="danger">{error}</Alert>}

      <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 text-sm text-red-900">
        <p className="flex items-center gap-2 font-bold">
          <AlertTriangle size={16} />
          Οριστική διαγραφή
        </p>
        <p className="mt-1">
          Η διαγραφή είναι αμετάκλητη. Παραστατικά και δεδομένα επιχειρήσεων
          όπου είσαι μοναδικός ιδιοκτήτης πρέπει να διαγραφούν χωριστά πρώτα.
        </p>
      </div>

      {hasPassword && (
        <Field
          label="Επιβεβαίωσε τον κωδικό σου"
          htmlFor="delete-password"
        >
          <PasswordField
            id="delete-password"
            name="password"
            autoComplete="current-password"
          />
        </Field>
      )}
      <Field
        label={"Πληκτρολόγησε ΔΙΑΓΡΑΦΗ για επιβεβαίωση"}
        htmlFor="confirm"
      >
        <Input
          id="confirm"
          name="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="ΔΙΑΓΡΑΦΗ"
        />
      </Field>

      <Button type="submit" variant="danger" disabled={disabled}>
        Διαγραφή λογαριασμού
      </Button>
    </form>
  );
}

AccountForms.Delete = DeleteAccountForm;
