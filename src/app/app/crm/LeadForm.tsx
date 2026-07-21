"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { saveLeadAction } from "./actions";

export function LeadForm({
  initial,
}: {
  initial?: {
    id?: string;
    fullName?: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    source?: string | null;
    status?: string;
    notes?: string | null;
  };
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    { error?: string } | null,
    FormData
  >(async (_prev, fd) => {
    const res = await saveLeadAction(fd);
    if (res.ok) {
      router.refresh();
      const form = document.querySelector<HTMLFormElement>(
        `form[data-form="lead"]`,
      );
      form?.reset();
      return null;
    }
    return { error: res.error };
  }, null);

  return (
    <form action={formAction} data-form="lead" className="space-y-3">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      {state?.error && (
        <p className="rounded-md bg-red-50 p-2 text-sm text-red-800">
          {state.error}
        </p>
      )}

      <Field label="Ονοματεπώνυμο" htmlFor="fullName">
        <Input
          id="fullName"
          name="fullName"
          required
          defaultValue={initial?.fullName}
          maxLength={160}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={initial?.email ?? ""}
          />
        </Field>
        <Field label="Τηλέφωνο" htmlFor="phone">
          <Input
            id="phone"
            name="phone"
            defaultValue={initial?.phone ?? ""}
            maxLength={40}
          />
        </Field>
      </div>
      <Field label="Εταιρεία" htmlFor="company">
        <Input
          id="company"
          name="company"
          defaultValue={initial?.company ?? ""}
          maxLength={160}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Πηγή" htmlFor="source">
          <Input
            id="source"
            name="source"
            defaultValue={initial?.source ?? ""}
            placeholder="Facebook, referral..."
            maxLength={80}
          />
        </Field>
        <Field label="Κατάσταση" htmlFor="status">
          <Select
            id="status"
            name="status"
            defaultValue={initial?.status ?? "new"}
          >
            <option value="new">Νέος</option>
            <option value="contacted">Επαφή</option>
            <option value="qualified">Κατάλληλος</option>
            <option value="disqualified">Απορρίφθηκε</option>
            <option value="converted">Πελάτης</option>
          </Select>
        </Field>
      </div>
      <Field label="Σημειώσεις" htmlFor="notes">
        <Textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={initial?.notes ?? ""}
          maxLength={5000}
        />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" icon={Save} disabled={pending}>
          {pending ? "Αποθήκευση..." : "Αποθήκευση"}
        </Button>
      </div>
    </form>
  );
}
