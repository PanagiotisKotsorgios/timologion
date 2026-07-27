"use client";

import { useActionState, useMemo, useState } from "react";
import { Save, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { money } from "@/lib/format";
import {
  createExpenseAction,
  updateExpenseAction,
  type ExpenseFormState,
} from "./actions";

/**
 * Suggested categories — user can still type anything, but a familiar list
 * covers ~90% of small-business expenses without dictating a taxonomy.
 */
const CATEGORY_SUGGESTIONS = [
  "Ενοίκιο",
  "ΔΕΗ / Νερό / Τηλέφωνο",
  "Καύσιμα",
  "Μεταφορικά",
  "Πρώτες ύλες",
  "Αναλώσιμα",
  "Μισθοδοσία",
  "Λογιστικά",
  "Ασφαλιστικά (ΕΦΚΑ)",
  "Επισκευές & συντήρηση",
  "Marketing / Διαφήμιση",
  "Λοιπά έξοδα",
];

const VAT_RATES = [0, 6, 13, 24] as const;

type ExpenseLike = {
  id?: string;
  supplierId?: string | null;
  category?: string | null;
  reference?: string | null;
  description?: string | null;
  netAmount?: number | string;
  vatRate?: number | string;
  issueDate?: Date | string;
  notes?: string | null;
};

type SupplierOption = { id: string; legalName: string };

export function ExpenseForm({
  mode,
  initial,
  suppliers,
}: {
  mode: "create" | "edit";
  initial?: ExpenseLike;
  suppliers: SupplierOption[];
}) {
  const action =
    mode === "create"
      ? createExpenseAction
      : (updateExpenseAction.bind(null, initial!.id!) as typeof createExpenseAction);

  const [state, formAction, pending] = useActionState<
    ExpenseFormState,
    FormData
  >(action, undefined);

  const today = new Date().toISOString().slice(0, 10);
  const initialDate =
    initial?.issueDate instanceof Date
      ? initial.issueDate.toISOString().slice(0, 10)
      : typeof initial?.issueDate === "string"
        ? initial.issueDate.slice(0, 10)
        : today;

  const [values, setValues] = useState({
    supplierId: initial?.supplierId ?? "",
    category: initial?.category ?? "",
    reference: initial?.reference ?? "",
    description: initial?.description ?? "",
    netAmount: String(initial?.netAmount ?? "0"),
    vatRate: String(initial?.vatRate ?? "24"),
    issueDate: initialDate,
    notes: initial?.notes ?? "",
  });

  function set<K extends keyof typeof values>(
    key: K,
    v: (typeof values)[K],
  ) {
    setValues((s) => ({ ...s, [key]: v }));
  }

  const preview = useMemo(() => {
    const net = Number(values.netAmount) || 0;
    const rate = Number(values.vatRate) || 0;
    const vat = Math.round(((net * rate) / 100) * 100) / 100;
    const total = Math.round((net + vat) * 100) / 100;
    return { net, vat, total };
  }, [values.netAmount, values.vatRate]);

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}

      <section className="grid gap-4 md:grid-cols-3">
        <Field label="Ημ/νία παραστατικού" htmlFor="issueDate" required>
          <Input
            id="issueDate"
            name="issueDate"
            type="date"
            required
            value={values.issueDate}
            onChange={(e) => set("issueDate", e.target.value)}
          />
        </Field>
        <Field label="Προμηθευτής" htmlFor="supplierId" className="md:col-span-2">
          <Select
            id="supplierId"
            name="supplierId"
            value={values.supplierId}
            onChange={(e) => set("supplierId", e.target.value)}
          >
            <option value="">— Χωρίς προμηθευτή —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.legalName}
              </option>
            ))}
          </Select>
        </Field>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Field label="Κατηγορία" htmlFor="category">
          <Input
            id="category"
            name="category"
            list="expense-category-suggestions"
            value={values.category}
            onChange={(e) => set("category", e.target.value)}
            maxLength={80}
            placeholder="π.χ. Ενοίκιο"
          />
          <datalist id="expense-category-suggestions">
            {CATEGORY_SUGGESTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Αρ. παραστατικού προμηθευτή" htmlFor="reference">
          <Input
            id="reference"
            name="reference"
            value={values.reference}
            onChange={(e) => set("reference", e.target.value)}
            maxLength={80}
            placeholder="π.χ. ΤΠΥ 000123"
          />
        </Field>
      </section>

      <Field label="Περιγραφή" htmlFor="description">
        <Textarea
          id="description"
          name="description"
          rows={2}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          maxLength={5000}
          placeholder="Σύντομη περιγραφή του εξόδου"
        />
      </Field>

      <section className="grid gap-4 md:grid-cols-3">
        <Field label="Καθαρή αξία (€)" htmlFor="netAmount" required>
          <Input
            id="netAmount"
            name="netAmount"
            type="number"
            step="0.01"
            min="0"
            required
            value={values.netAmount}
            onChange={(e) => set("netAmount", e.target.value)}
          />
        </Field>
        <Field label="ΦΠΑ (%)" htmlFor="vatRate" required>
          <Select
            id="vatRate"
            name="vatRate"
            value={values.vatRate}
            onChange={(e) => set("vatRate", e.target.value)}
          >
            {VAT_RATES.map((r) => (
              <option key={r} value={r}>
                {r}%
              </option>
            ))}
          </Select>
        </Field>
        <div className="rounded-2xl border-2 border-brand-100 bg-brand-50/50 p-4">
          <div className="flex justify-between text-sm text-ink-700">
            <span>Καθαρό</span>
            <span className="font-semibold">{money(preview.net)}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm text-ink-700">
            <span>ΦΠΑ</span>
            <span className="font-semibold">{money(preview.vat)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t-2 border-brand-200 pt-2 text-base">
            <span className="font-bold text-brand-900">Σύνολο</span>
            <span className="text-lg font-extrabold text-brand-900">
              {money(preview.total)}
            </span>
          </div>
        </div>
      </section>

      <Field label="Σημειώσεις" htmlFor="notes">
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          maxLength={5000}
        />
      </Field>

      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          disabled={pending}
          icon={mode === "create" ? Plus : Save}
        >
          {pending
            ? "Αποθήκευση..."
            : mode === "create"
              ? "Καταχώρηση"
              : "Αποθήκευση"}
        </Button>
      </div>
    </form>
  );
}
