"use client";

import { useActionState } from "react";
import { Bell } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { createRuleAction } from "./actions";

const METRICS: Array<{ value: string; label: string; suggested: number }> = [
  { value: "errors_1h", label: "Σφάλματα · 1 ώρα", suggested: 25 },
  { value: "errors_24h", label: "Σφάλματα · 24 ώρες", suggested: 200 },
  { value: "webhook_gap_hours", label: "Wrapp webhook gap (ώρες)", suggested: 6 },
  { value: "past_due_subs", label: "Past-due συνδρομές", suggested: 5 },
  { value: "backup_age_hours", label: "Ηλικία τελ. backup (ώρες)", suggested: 30 },
  { value: "active_sessions", label: "Ενεργές συνεδρίες", suggested: 500 },
  { value: "new_signups_24h", label: "Νέες εγγραφές · 24h", suggested: 100 },
  { value: "broken_documents", label: "Παραστ. χωρίς γραμμές", suggested: 1 },
];

export function CreateRuleForm() {
  const [state, formAction, pending] = useActionState<
    { ok?: boolean; error?: string } | undefined,
    FormData
  >(createRuleAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {state?.ok && <Alert tone="success">Ο κανόνας δημιουργήθηκε.</Alert>}

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Όνομα" htmlFor="ar-name" className="md:col-span-2">
          <Input
            id="ar-name"
            name="name"
            required
            maxLength={160}
            placeholder="π.χ. Πολλά σφάλματα την ώρα"
          />
        </Field>
        <Field label="Email παραλήπτη" htmlFor="ar-email">
          <Input
            id="ar-email"
            name="emailTo"
            type="email"
            required
            placeholder="ops@timologion.gr"
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Field label="Metric" htmlFor="ar-metric" className="md:col-span-2">
          <Select id="ar-metric" name="metric" defaultValue="errors_1h">
            {METRICS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Συνθήκη" htmlFor="ar-comp">
          <Select id="ar-comp" name="comparator" defaultValue="gt">
            <option value="gt">{"> (μεγαλύτερο)"}</option>
            <option value="gte">{"≥"}</option>
            <option value="lt">{"< (μικρότερο)"}</option>
            <option value="lte">{"≤"}</option>
            <option value="eq">{"="}</option>
          </Select>
        </Field>
        <Field label="Threshold" htmlFor="ar-thr">
          <Input
            id="ar-thr"
            name="threshold"
            type="number"
            step="any"
            required
            defaultValue={25}
          />
        </Field>
      </div>

      <Field
        label="Cooldown (λεπτά)"
        htmlFor="ar-cool"
        help="Αν ο κανόνας ξαναφτιάξει μέσα σε αυτό το διάστημα, δεν στέλνει."
      >
        <Input
          id="ar-cool"
          name="cooldownMin"
          type="number"
          min={1}
          max={1440}
          defaultValue={60}
        />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" icon={Bell} disabled={pending}>
          {pending ? "Δημιουργία..." : "Δημιουργία κανόνα"}
        </Button>
      </div>
    </form>
  );
}
