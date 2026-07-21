"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { saveOpportunityAction } from "./actions";

type LeadOpt = { id: string; fullName: string };

export function OpportunityForm({ leads }: { leads: LeadOpt[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    { error?: string } | null,
    FormData
  >(async (_prev, fd) => {
    const res = await saveOpportunityAction(fd);
    if (res.ok) {
      router.refresh();
      const form = document.querySelector<HTMLFormElement>(
        `form[data-form="opp"]`,
      );
      form?.reset();
      return null;
    }
    return { error: res.error };
  }, null);

  return (
    <form action={formAction} data-form="opp" className="space-y-3">
      {state?.error && (
        <p className="rounded-md bg-red-50 p-2 text-sm text-red-800">
          {state.error}
        </p>
      )}

      <Field label="Τίτλος" htmlFor="title">
        <Input id="title" name="title" required maxLength={200} />
      </Field>
      <Field label="Lead" htmlFor="leadId">
        <Select id="leadId" name="leadId" defaultValue="">
          <option value="">— Χωρίς σύνδεση —</option>
          {leads.map((l) => (
            <option key={l.id} value={l.id}>
              {l.fullName}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ποσό (€)" htmlFor="amount">
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            defaultValue="0"
          />
        </Field>
        <Field label="Πιθανότητα %" htmlFor="probability">
          <Input
            id="probability"
            name="probability"
            type="number"
            min="0"
            max="100"
            defaultValue="50"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Στάδιο" htmlFor="stage">
          <Select id="stage" name="stage" defaultValue="discovery">
            <option value="discovery">Discovery</option>
            <option value="proposal">Πρόταση</option>
            <option value="negotiation">Διαπραγμάτευση</option>
            <option value="won">Κερδισμένη</option>
            <option value="lost">Χαμένη</option>
          </Select>
        </Field>
        <Field label="Αναμ. κλείσιμο" htmlFor="expectedCloseAt">
          <Input
            id="expectedCloseAt"
            name="expectedCloseAt"
            type="date"
          />
        </Field>
      </div>
      <Field label="Σημειώσεις" htmlFor="notes">
        <Textarea id="notes" name="notes" rows={2} maxLength={5000} />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" icon={Plus} disabled={pending}>
          {pending ? "Δημιουργία..." : "Δημιουργία"}
        </Button>
      </div>
    </form>
  );
}
