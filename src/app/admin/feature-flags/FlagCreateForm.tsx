"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { createFlagAction } from "./actions";

export function FlagCreateForm() {
  const [state, formAction, pending] = useActionState<
    { error?: string; success?: string } | undefined,
    FormData
  >(createFlagAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}
      <div className="grid gap-4 md:grid-cols-3">
        <Field
          label="Key"
          htmlFor="flag-key"
          help="π.χ. pos_split_bill · μόνο πεζά και underscores"
        >
          <Input
            id="flag-key"
            name="key"
            required
            placeholder="feature_key"
          />
        </Field>
        <Field
          label="Περιγραφή"
          htmlFor="flag-desc"
          className="md:col-span-2"
        >
          <Input
            id="flag-desc"
            name="description"
            placeholder="Τι κάνει αυτό το flag..."
          />
        </Field>
        <Field label="Rollout" htmlFor="flag-rollout">
          <Select id="flag-rollout" name="rollout" defaultValue="none">
            <option value="none">none (ανενεργό)</option>
            <option value="beta">beta (μόνο overrides)</option>
            <option value="all">all (όλοι)</option>
          </Select>
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Δημιουργία..." : "Δημιουργία flag"}
        </Button>
      </div>
    </form>
  );
}
