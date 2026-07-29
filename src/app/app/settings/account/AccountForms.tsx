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
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [ack1, setAck1] = useState(false);
  const [ack2, setAck2] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(fd: FormData) {
    setError(null);
    const res = await deleteAccountAction(fd);
    if (res && "error" in res && res.error) setError(res.error);
  }

  const disabled = confirm.trim() !== "ΔΙΑΓΡΑΦΗ" || !ack1 || !ack2;

  if (!open) {
    return (
      <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 text-sm text-red-900">
        <p className="flex items-center gap-2 font-bold">
          <AlertTriangle size={16} />
          Οριστική διαγραφή λογαριασμού
        </p>
        <p className="mt-1 text-red-800">
          Θα διαγραφούν όλα σου τα δεδομένα (επιχειρήσεις όπου είσαι μοναδικός
          ιδιοκτήτης, παραστατικά, πελάτες). Η συνδρομή σου{" "}
          <strong>δεν επιστρέφεται</strong>. Η ενέργεια είναι αμετάκλητη.
        </p>
        <Button
          type="button"
          variant="danger"
          size="md"
          className="mt-4"
          onClick={() => setOpen(true)}
        >
          Θέλω να διαγράψω τον λογαριασμό μου
        </Button>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && <Alert tone="danger">{error}</Alert>}

      <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4 text-sm text-red-900">
        <p className="flex items-center gap-2 font-bold">
          <AlertTriangle size={16} />
          Τι θα συμβεί όταν πατήσεις «Διαγραφή»
        </p>
        <ul className="mt-2 space-y-1 pl-5 text-red-800 [list-style-type:disc]">
          <li>
            Θα διαγραφούν <strong>όλες οι επιχειρήσεις</strong> όπου είσαι
            μοναδικός ιδιοκτήτης, μαζί με τα παραστατικά, τους πελάτες, τα
            είδη και τις ρυθμίσεις τους.
          </li>
          <li>
            Θα αποσυνδεθείς από κάθε επιχείρηση όπου είσαι απλό μέλος
            (χωρίς να διαγραφεί η επιχείρηση).
          </li>
          <li>
            Η <strong>συνδρομή δεν επιστρέφεται</strong>. Αν χρησιμοποιείς
            πληρωμένο πλάνο, η συνδρομή σου συνεχίζει μέχρι το τέλος της
            τρέχουσας περιόδου, αλλά τα χρήματα δεν επιστρέφονται.
          </li>
          <li>
            Παραστατικά που έχουν ήδη σταλεί στην ΑΑΔΕ μέσω του παρόχου
            (Wrapp) <strong>δεν διαγράφονται από το myDATA</strong> — μόνο
            από τη δική μας πλατφόρμα. Είναι νομική υποχρέωση να διατηρηθούν
            εκεί.
          </li>
          <li>
            Κρατάμε ένα <strong>snapshot</strong> με το email, το όνομά σου
            και τον αριθμό των παραστατικών σου, για λόγους υποστήριξης και
            νομικών υποχρεώσεων.
          </li>
        </ul>
      </div>

      <Field
        label="Ο λόγος διαγραφής (προαιρετικά)"
        htmlFor="delete-reason"
      >
        <textarea
          id="delete-reason"
          name="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={2000}
          rows={2}
          placeholder="π.χ. Έκλεισα την επιχείρηση, δεν χρειάζομαι πλέον την υπηρεσία..."
          className="w-full rounded-lg border-2 border-ink-300 bg-white px-4 py-3 text-base text-ink-900 focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
        />
      </Field>

      <label className="flex items-start gap-3 rounded-lg border-2 border-red-200 bg-white p-3 text-sm">
        <input
          type="checkbox"
          name="acknowledgeNoRefund"
          checked={ack1}
          onChange={(e) => setAck1(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-red-400 text-red-700"
        />
        <span className="text-red-900">
          Καταλαβαίνω ότι η <strong>συνδρομή δεν επιστρέφεται</strong>.
        </span>
      </label>
      <label className="flex items-start gap-3 rounded-lg border-2 border-red-200 bg-white p-3 text-sm">
        <input
          type="checkbox"
          name="acknowledgeDataLoss"
          checked={ack2}
          onChange={(e) => setAck2(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-red-400 text-red-700"
        />
        <span className="text-red-900">
          Καταλαβαίνω ότι <strong>όλα τα δεδομένα μου θα χαθούν</strong>{" "}
          και η ενέργεια είναι αμετάκλητη.
        </span>
      </label>

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
        label="Πληκτρολόγησε ΔΙΑΓΡΑΦΗ για επιβεβαίωση"
        htmlFor="confirm"
      >
        <Input
          id="confirm"
          name="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="ΔΙΑΓΡΑΦΗ"
          autoComplete="off"
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setOpen(false);
            setConfirm("");
            setAck1(false);
            setAck2(false);
            setError(null);
          }}
        >
          Άκυρο
        </Button>
        <Button type="submit" variant="danger" disabled={disabled}>
          Οριστική διαγραφή λογαριασμού
        </Button>
      </div>
    </form>
  );
}

// Static properties on client-component boundaries aren't reliably preserved
// through Next.js RSC serialization — the reference the server component holds
// is a client-component descriptor, not the raw function, so
// `AccountForms.Delete` disappears at render time. Export explicitly instead.
export { DeleteAccountForm };
