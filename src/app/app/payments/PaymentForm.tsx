"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { recordPaymentAction, type PaymentFormState } from "./actions";

const METHODS: { value: string; label: string }[] = [
  { value: "cash", label: "Μετρητά" },
  { value: "card", label: "Κάρτα" },
  { value: "bank_transfer", label: "Τραπεζική μεταφορά" },
  { value: "iris", label: "IRIS" },
  { value: "check", label: "Επιταγή" },
  { value: "credit", label: "Επί πιστώσει" },
  { value: "other", label: "Άλλο" },
];

export function PaymentForm({
  documentId,
  clientId,
  defaultAmount,
  onSaved,
}: {
  documentId?: string;
  clientId?: string;
  defaultAmount?: number;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<PaymentFormState, FormData>(
    async (prev, fd) => {
      const res = await recordPaymentAction(prev, fd);
      if (!res || !res.error) {
        onSaved?.();
        router.refresh();
      }
      return res;
    },
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {documentId && <input type="hidden" name="documentId" value={documentId} />}
      {clientId && <input type="hidden" name="clientId" value={clientId} />}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Ποσό (€)" htmlFor="amount">
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={defaultAmount?.toFixed(2) ?? ""}
          />
        </Field>
        <Field label="Μέθοδος" htmlFor="method">
          <Select id="method" name="method" defaultValue="cash">
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ημερομηνία είσπραξης" htmlFor="receivedAt">
          <Input
            id="receivedAt"
            name="receivedAt"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </Field>
        <Field
          label="Αναφορά (προαιρετικά)"
          htmlFor="reference"
          hint="π.χ. αριθμός εντολής"
        >
          <Input id="reference" name="reference" maxLength={160} />
        </Field>
      </div>
      <Field label="Σημειώσεις" htmlFor="notes">
        <Textarea id="notes" name="notes" rows={2} maxLength={2000} />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} icon={Wallet}>
          {pending ? "Αποθήκευση..." : "Καταχώρηση είσπραξης"}
        </Button>
      </div>
    </form>
  );
}
