"use client";

import { useActionState } from "react";
import { Save, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Field, Select } from "@/components/ui/Input";
import { updateSessionTimeoutAction } from "./actions";

type State = { error?: string; success?: string } | undefined;

const OPTIONS: { value: number; label: string }[] = [
  { value: 15, label: "15 λεπτά" },
  { value: 30, label: "30 λεπτά" },
  { value: 60, label: "1 ώρα" },
  { value: 120, label: "2 ώρες" },
  { value: 240, label: "4 ώρες" },
  { value: 480, label: "8 ώρες" },
];

export function SessionTimeoutForm({
  currentMinutes,
}: {
  currentMinutes: number;
}) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    updateSessionTimeoutAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}

      <p className="text-sm text-ink-700">
        Θα αποσυνδεόμαστε αυτόματα μετά από αδράνεια για ασφάλεια. Ο
        μετρητής εμφανίζεται στο πάνω μέρος και μηδενίζεται σε κάθε
        κλικ, πάτημα πλήκτρου ή scroll.
      </p>

      <Field label="Αδράνεια πριν την αποσύνδεση" htmlFor="minutes">
        <Select
          id="minutes"
          name="minutes"
          defaultValue={String(currentMinutes)}
          disabled={pending}
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>

      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          icon={pending ? Clock : Save}
          disabled={pending}
        >
          {pending ? "Αποθήκευση..." : "Αποθήκευση"}
        </Button>
      </div>
    </form>
  );
}
