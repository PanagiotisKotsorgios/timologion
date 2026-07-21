"use client";

import { useActionState } from "react";
import { Save, Plus } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { savePlanAction, type PlanFormState } from "@/app/admin/billing/actions";

type Initial = {
  id?: string;
  code?: string;
  name?: string;
  description?: string | null;
  priceMonthly?: string | number;
  priceYearly?: string | number;
  includedDocsMonth?: number;
  features?: string | null;
  active?: boolean;
  sortOrder?: number;
};

export function PlanForm({ initial }: { initial?: Initial }) {
  const [state, formAction, pending] = useActionState<PlanFormState, FormData>(
    savePlanAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Κωδικός" htmlFor="code" hint="π.χ. starter, business_annual">
          <Input
            id="code"
            name="code"
            defaultValue={initial?.code ?? ""}
            required
            maxLength={40}
            placeholder="starter"
          />
        </Field>
        <Field
          label="Όνομα εμφάνισης"
          htmlFor="name"
          className="md:col-span-2"
        >
          <Input
            id="name"
            name="name"
            defaultValue={initial?.name ?? ""}
            required
            maxLength={120}
            placeholder="Starter"
          />
        </Field>
      </div>

      <Field label="Περιγραφή" htmlFor="description">
        <Textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={initial?.description ?? ""}
          maxLength={400}
          placeholder="Σύντομη περιγραφή του πακέτου."
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Τιμή / μήνα (€)" htmlFor="priceMonthly">
          <Input
            id="priceMonthly"
            name="priceMonthly"
            type="number"
            step="0.01"
            min="0"
            defaultValue={String(initial?.priceMonthly ?? "0")}
            required
          />
        </Field>
        <Field label="Τιμή / έτος (€)" htmlFor="priceYearly">
          <Input
            id="priceYearly"
            name="priceYearly"
            type="number"
            step="0.01"
            min="0"
            defaultValue={String(initial?.priceYearly ?? "0")}
            required
          />
        </Field>
        <Field
          label="Παραστατικά / μήνα"
          htmlFor="includedDocsMonth"
          hint="0 = απεριόριστα"
        >
          <Input
            id="includedDocsMonth"
            name="includedDocsMonth"
            type="number"
            min="0"
            defaultValue={String(initial?.includedDocsMonth ?? "0")}
            required
          />
        </Field>
      </div>

      <Field
        label="Χαρακτηριστικά"
        htmlFor="features"
        hint="Μία γραμμή ανά χαρακτηριστικό."
      >
        <Textarea
          id="features"
          name="features"
          rows={5}
          defaultValue={initial?.features ?? ""}
          placeholder={"Έκδοση παραστατικών\nΠελατολόγιο\nΠρόσβαση από κινητό"}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Σειρά εμφάνισης" htmlFor="sortOrder">
          <Input
            id="sortOrder"
            name="sortOrder"
            type="number"
            min="0"
            defaultValue={String(initial?.sortOrder ?? "100")}
          />
        </Field>
        <label className="flex items-end gap-3 pb-2 text-base font-semibold text-ink-900">
          <input
            type="checkbox"
            name="active"
            defaultChecked={initial?.active ?? true}
            className="h-5 w-5 rounded border-2 border-ink-500 text-brand-700"
          />
          Ενεργό πακέτο (διαθέσιμο προς πώληση)
        </label>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          icon={initial?.id ? Save : Plus}
        >
          {pending
            ? "Αποθήκευση..."
            : initial?.id
              ? "Αποθήκευση αλλαγών"
              : "Δημιουργία πακέτου"}
        </Button>
      </div>
    </form>
  );
}
