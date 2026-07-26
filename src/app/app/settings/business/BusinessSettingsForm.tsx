"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { t } from "@/lib/i18n";
import {
  updateBusinessAction,
  type BusinessSettingsState,
} from "./actions";

type BusinessLike = {
  vatNumber: string;
  legalName: string;
  tradeName?: string | null;
  taxOffice?: string | null;
  activity?: string | null;
  addressLine?: string | null;
  city?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  defaultDocumentNotes?: string | null;
};

export function BusinessSettingsForm({ initial }: { initial: BusinessLike }) {
  const [state, formAction, pending] = useActionState<
    BusinessSettingsState,
    FormData
  >(updateBusinessAction, undefined);

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}

      <section className="grid gap-4 md:grid-cols-2">
        <Field label={t.onboarding.vat} htmlFor="vatNumber">
          <Input
            id="vatNumber"
            name="vatNumber"
            defaultValue={initial.vatNumber}
            required
            maxLength={20}
          />
        </Field>
        <Field label={t.onboarding.taxOffice} htmlFor="taxOffice">
          <Input
            id="taxOffice"
            name="taxOffice"
            defaultValue={initial.taxOffice ?? ""}
            maxLength={120}
          />
        </Field>
        <Field
          label={t.onboarding.legalName}
          htmlFor="legalName"
          className="md:col-span-2"
        >
          <Input
            id="legalName"
            name="legalName"
            defaultValue={initial.legalName}
            required
            maxLength={160}
          />
        </Field>
        <Field label={t.onboarding.tradeName} htmlFor="tradeName">
          <Input
            id="tradeName"
            name="tradeName"
            defaultValue={initial.tradeName ?? ""}
            maxLength={160}
          />
        </Field>
        <Field label={t.onboarding.activity} htmlFor="activity">
          <Input
            id="activity"
            name="activity"
            defaultValue={initial.activity ?? ""}
            maxLength={200}
          />
        </Field>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Field
          label={t.onboarding.address}
          htmlFor="addressLine"
          className="md:col-span-2"
        >
          <Input
            id="addressLine"
            name="addressLine"
            defaultValue={initial.addressLine ?? ""}
            maxLength={200}
          />
        </Field>
        <Field label={t.onboarding.city} htmlFor="city">
          <Input
            id="city"
            name="city"
            defaultValue={initial.city ?? ""}
            maxLength={80}
          />
        </Field>
        <Field label={t.onboarding.postalCode} htmlFor="postalCode">
          <Input
            id="postalCode"
            name="postalCode"
            defaultValue={initial.postalCode ?? ""}
            maxLength={20}
          />
        </Field>
        <Field label={t.onboarding.phone} htmlFor="phone">
          <Input
            id="phone"
            name="phone"
            defaultValue={initial.phone ?? ""}
            maxLength={30}
          />
        </Field>
        <Field label={t.onboarding.email} htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={initial.email ?? ""}
            maxLength={160}
          />
        </Field>
      </section>

      <section className="space-y-3 border-t-2 border-ink-300/60 pt-6">
        <div>
          <h3 className="text-lg font-extrabold text-ink-900">
            Προεπιλεγμένες σημειώσεις παραστατικών
          </h3>
          <p className="mt-1 text-sm text-ink-700">
            Εμφανίζονται προσυμπληρωμένα στο πεδίο «Σημειώσεις» κάθε νέου
            πρόχειρου παραστατικού. Χρήσιμο για IBAN, γενικούς όρους,
            υποσημειώσεις.
          </p>
        </div>
        <Field label="Κείμενο" htmlFor="defaultDocumentNotes">
          <Textarea
            id="defaultDocumentNotes"
            name="defaultDocumentNotes"
            defaultValue={initial.defaultDocumentNotes ?? ""}
            rows={5}
            maxLength={5000}
            placeholder={
              "π.χ.\nΤράπεζα Πειραιώς — IBAN: GR12 3456 7890\nΠληρωμή εντός 30 ημερών.\nΕυχαριστούμε για τη συνεργασία."
            }
          />
        </Field>
        {initial.defaultDocumentNotes && (
          <div className="rounded-xl border-2 border-ink-300/60 bg-ink-100 p-4">
            <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-ink-500">
              Προεπισκόπηση
            </p>
            <p className="whitespace-pre-wrap text-sm text-ink-800">
              {initial.defaultDocumentNotes}
            </p>
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} icon={Save}>
          {pending ? t.common.loading : t.common.save}
        </Button>
      </div>
    </form>
  );
}
