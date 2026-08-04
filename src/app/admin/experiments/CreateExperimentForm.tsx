"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { createExperimentAction } from "./actions";

export function CreateExperimentForm() {
  const [state, formAction, pending] = useActionState<
    { ok?: boolean; error?: string } | undefined,
    FormData
  >(createExperimentAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {state?.ok && <Alert tone="success">Δημιουργήθηκε.</Alert>}

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Key" htmlFor="ex-key" help="π.χ. new_onboarding_flow">
          <Input id="ex-key" name="key" required placeholder="feature_key" />
        </Field>
        <Field
          label="Split (A/B)"
          htmlFor="ex-split"
          help="Ποσοστό tenants που παίρνει variant A."
        >
          <Input
            id="ex-split"
            name="variantAPct"
            type="number"
            min={0}
            max={100}
            defaultValue={50}
          />
        </Field>
        <Field label="Περιγραφή" htmlFor="ex-desc" className="md:col-span-1">
          <Input
            id="ex-desc"
            name="description"
            placeholder="Τι δοκιμάζουμε..."
            maxLength={500}
          />
        </Field>
      </div>
      <Field label="Hypothesis (προαιρετικά)" htmlFor="ex-hypo">
        <Textarea
          id="ex-hypo"
          name="hypothesis"
          rows={2}
          placeholder="Αναμένουμε ότι το variant B θα αυξήσει το X κατά Y%..."
        />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Δημιουργία..." : "Δημιουργία"}
        </Button>
      </div>
    </form>
  );
}
