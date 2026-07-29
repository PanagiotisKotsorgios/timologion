"use client";

import { useActionState } from "react";
import { Save, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { t } from "@/lib/i18n";
import {
  createItemAction,
  updateItemAction,
  type ItemFormState,
} from "./actions";

type ItemLike = {
  id?: string;
  kind?: "service" | "product";
  code?: string | null;
  name?: string;
  description?: string | null;
  unit?: string;
  defaultPrice?: number | string;
  vatRate?: number | string;
  vatCategory?: string | null;
  stockOnHand?: number | string | null;
  stockAlertAt?: number | string | null;
};

const VAT_RATES = [24, 13, 6, 0];

export function ItemForm({
  initial,
  mode,
}: {
  initial?: ItemLike;
  mode: "create" | "edit";
}) {
  const action =
    mode === "create"
      ? createItemAction
      : (updateItemAction.bind(null, initial!.id!) as typeof createItemAction);

  const [state, formAction, pending] = useActionState<ItemFormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}

      <section className="grid gap-4 md:grid-cols-3">
        <Field
          label="Τύπος"
          htmlFor="kind"
          help="Προϊόν = φυσικό αντικείμενο με απόθεμα (π.χ. τσάντα). Υπηρεσία = χρονοχρέωση ή εργασία χωρίς απόθεμα (π.χ. συμβουλευτική)."
        >
          <Select id="kind" name="kind" defaultValue={initial?.kind ?? "service"}>
            <option value="service">Υπηρεσία</option>
            <option value="product">Προϊόν</option>
          </Select>
        </Field>
        <Field
          label="Κωδικός"
          htmlFor="code"
          help="Δικός σου εσωτερικός κωδικός (SKU) — π.χ. «TSH-BLK-M». Χρησιμοποιείται για αναζήτηση και σε barcode· δεν φαίνεται στον πελάτη."
        >
          <Input
            id="code"
            name="code"
            defaultValue={initial?.code ?? ""}
            maxLength={60}
          />
        </Field>
        <Field
          label="Μονάδα"
          htmlFor="unit"
          help="Μονάδα μέτρησης πώλησης — π.χ. τμχ, κιλά, μέτρα, ώρες, εκτ."
        >
          <Input
            id="unit"
            name="unit"
            defaultValue={initial?.unit ?? "τμχ"}
            maxLength={20}
          />
        </Field>
        <Field
          label="Ονομασία"
          htmlFor="name"
          className="md:col-span-3"
          help="Το όνομα του είδους όπως θέλεις να εμφανίζεται στα παραστατικά (π.χ. «Μπλουζάκι μαύρο medium»)."
        >
          <Input
            id="name"
            name="name"
            required
            defaultValue={initial?.name ?? ""}
            maxLength={160}
          />
        </Field>
        <Field
          label="Τιμή"
          htmlFor="defaultPrice"
          help="Προτεινόμενη τιμή μονάδας ΧΩΡΙΣ ΦΠΑ σε ευρώ. Μπορείς να την τροποποιήσεις σε κάθε παραστατικό."
        >
          <Input
            id="defaultPrice"
            name="defaultPrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={String(initial?.defaultPrice ?? "0.00")}
          />
        </Field>
        <Field
          label="ΦΠΑ (%)"
          htmlFor="vatRate"
          help="Συντελεστής ΦΠΑ που εφαρμόζεται στο είδος. Στην Ελλάδα: 24% (κανονικός), 13% (μειωμένος — τρόφιμα, φάρμακα), 6% (υπερμειωμένος — βιβλία, εφημερίδες), 0% (απαλλαγή)."
        >
          <Select
            id="vatRate"
            name="vatRate"
            defaultValue={String(initial?.vatRate ?? "24")}
          >
            {VAT_RATES.map((r) => (
              <option key={r} value={r}>
                {r}%
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Κατηγορία ΦΠΑ (προαιρετικό)"
          htmlFor="vatCategory"
          help="Κωδικός myDATA κατηγορίας ΦΠΑ (π.χ. «1» = ΦΠΑ 24%, «2» = 13%, «7» = απαλλαγή). Άφησέ το κενό — υπολογίζεται αυτόματα από τον συντελεστή."
        >
          <Input
            id="vatCategory"
            name="vatCategory"
            defaultValue={initial?.vatCategory ?? ""}
            maxLength={20}
          />
        </Field>
      </section>

      <Field label="Περιγραφή" htmlFor="description">
        <Textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
        />
      </Field>

      <section className="grid gap-4 md:grid-cols-2">
        <Field
          label="Απόθεμα (κενό = δεν παρακολουθείται)"
          htmlFor="stockOnHand"
          help="Τρέχουσα ποσότητα διαθέσιμη στην αποθήκη. Αφήνοντάς το κενό, το σύστημα δεν παρακολουθεί απόθεμα για αυτό το είδος."
        >
          <Input
            id="stockOnHand"
            name="stockOnHand"
            type="number"
            step="0.001"
            defaultValue={
              initial?.stockOnHand != null ? String(initial.stockOnHand) : ""
            }
            placeholder="—"
          />
        </Field>
        <Field
          label="Ειδοποίηση χαμηλού αποθέματος"
          htmlFor="stockAlertAt"
          help="Όταν το απόθεμα πέσει κάτω από αυτό το όριο, εμφανίζεται προειδοποίηση στο dashboard."
        >
          <Input
            id="stockAlertAt"
            name="stockAlertAt"
            type="number"
            step="0.001"
            defaultValue={
              initial?.stockAlertAt != null ? String(initial.stockAlertAt) : ""
            }
            placeholder="π.χ. 5"
          />
        </Field>
      </section>

      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          disabled={pending}
          icon={mode === "create" ? Plus : Save}
        >
          {pending
            ? t.common.loading
            : mode === "create"
              ? t.common.create
              : t.common.save}
        </Button>
      </div>
    </form>
  );
}
