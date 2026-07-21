"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { t } from "@/lib/i18n";
import { saveBranchAction, type BranchFormState } from "./actions";

type BranchLike = {
  id?: string;
  label?: string;
  addressLine?: string | null;
  city?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  isDefault?: boolean;
};

export function BranchForm({
  initial,
  onSaved,
}: {
  initial?: BranchLike;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState<BranchFormState, FormData>(
    async (prev, fd) => {
      const res = await saveBranchAction(prev, fd);
      if (res && "success" in res && res.success && onSaved) onSaved();
      return res;
    },
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}

      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Όνομα υποκαταστήματος" htmlFor="label">
          <Input
            id="label"
            name="label"
            defaultValue={initial?.label ?? ""}
            required
            maxLength={120}
          />
        </Field>
        <Field label="Τηλέφωνο" htmlFor="phone">
          <Input
            id="phone"
            name="phone"
            defaultValue={initial?.phone ?? ""}
            maxLength={30}
          />
        </Field>
        <Field
          label="Διεύθυνση"
          htmlFor="addressLine"
          className="md:col-span-2"
        >
          <Input
            id="addressLine"
            name="addressLine"
            defaultValue={initial?.addressLine ?? ""}
            maxLength={200}
          />
        </Field>
        <Field label="Πόλη" htmlFor="city">
          <Input
            id="city"
            name="city"
            defaultValue={initial?.city ?? ""}
            maxLength={80}
          />
        </Field>
        <Field label="Τ.Κ." htmlFor="postalCode">
          <Input
            id="postalCode"
            name="postalCode"
            defaultValue={initial?.postalCode ?? ""}
            maxLength={20}
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
        Προεπιλεγμένο υποκατάστημα
      </label>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} icon={Save}>
          {pending ? t.common.loading : t.common.save}
        </Button>
      </div>
    </form>
  );
}
