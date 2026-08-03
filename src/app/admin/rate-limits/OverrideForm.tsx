"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { saveOverrideAction } from "./actions";

export function OverrideForm() {
  const [state, formAction, pending] = useActionState<
    { ok?: boolean; error?: string } | undefined,
    FormData
  >(saveOverrideAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {state?.ok && <Alert tone="success">Αποθηκεύτηκε.</Alert>}

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Business ID"
          htmlFor="rl-biz"
          help="cuid της επιχείρησης — από /admin/businesses."
        >
          <Input id="rl-biz" name="businessId" required maxLength={191} />
        </Field>
        <Field
          label="Action"
          htmlFor="rl-action"
          help="π.χ. api, wrapp_issue, export_bulk"
        >
          <Input id="rl-action" name="action" required maxLength={60} />
        </Field>
        <Field
          label="Capacity (bucket size)"
          htmlFor="rl-cap"
          help="Πόσα tokens χωράει το bucket."
        >
          <Input
            id="rl-cap"
            name="capacity"
            type="number"
            min={1}
            max={100000}
            required
            defaultValue={60}
          />
        </Field>
        <Field
          label="Refill (ms per token)"
          htmlFor="rl-refill"
          help="Πόσα ms για να προστεθεί 1 token πίσω."
        >
          <Input
            id="rl-refill"
            name="refillMs"
            type="number"
            min={1}
            max={3600000}
            required
            defaultValue={1000}
          />
        </Field>
      </div>
      <Field label="Σχόλιο (προαιρετικά)" htmlFor="rl-note">
        <Input id="rl-note" name="note" maxLength={500} placeholder="π.χ. VIP tenant · μεγαλύτερο headroom" />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" icon={Save} disabled={pending}>
          {pending ? "Αποθήκευση..." : "Αποθήκευση override"}
        </Button>
      </div>
    </form>
  );
}
