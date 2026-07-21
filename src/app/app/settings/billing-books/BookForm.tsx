"use client";

import { useActionState } from "react";
import type { DocumentType } from "@prisma/client";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { t } from "@/lib/i18n";
import {
  saveBillingBookAction,
  type BillingBookFormState,
} from "./actions";

type BookLike = {
  id?: string;
  documentType?: DocumentType;
  series?: string;
  label?: string | null;
  branchId?: string | null;
  nextNumber?: number;
  isDefault?: boolean;
};

const DOC_TYPES: DocumentType[] = [
  "invoice",
  "service_invoice",
  "retail_receipt",
  "service_receipt",
  "credit_note",
  "proforma",
  "quote",
  "order",
  "delivery_note",
];

export function BookForm({
  initial,
  branches,
}: {
  initial?: BookLike;
  branches: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState<
    BillingBookFormState,
    FormData
  >(saveBillingBookAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}

      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Τύπος παραστατικού" htmlFor="documentType">
          <Select
            id="documentType"
            name="documentType"
            defaultValue={initial?.documentType ?? "invoice"}
          >
            {DOC_TYPES.map((d) => (
              <option key={d} value={d}>
                {t.documents.types[d]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Σειρά (π.χ. A)" htmlFor="series">
          <Input
            id="series"
            name="series"
            defaultValue={initial?.series ?? ""}
            required
            maxLength={20}
          />
        </Field>
        <Field label="Περιγραφή (προαιρετικό)" htmlFor="label">
          <Input
            id="label"
            name="label"
            defaultValue={initial?.label ?? ""}
            maxLength={120}
          />
        </Field>
        <Field label="Υποκατάστημα" htmlFor="branchId">
          <Select
            id="branchId"
            name="branchId"
            defaultValue={initial?.branchId ?? ""}
          >
            <option value="">— Όλα —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Επόμενος αριθμός" htmlFor="nextNumber">
          <Input
            id="nextNumber"
            name="nextNumber"
            type="number"
            min="1"
            defaultValue={String(initial?.nextNumber ?? 1)}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          name="isDefault"
          defaultChecked={initial?.isDefault ?? false}
          className="h-4 w-4 rounded border-ink-300 text-brand-600"
        />
        Προεπιλεγμένη σειρά για αυτόν τον τύπο
      </label>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} icon={Save}>
          {pending ? t.common.loading : t.common.save}
        </Button>
      </div>
    </form>
  );
}
