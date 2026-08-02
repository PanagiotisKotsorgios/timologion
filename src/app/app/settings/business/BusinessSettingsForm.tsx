"use client";

import { useActionState, useState } from "react";
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

  const [notes, setNotes] = useState(initial.defaultDocumentNotes ?? "");

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}

      <section className="grid gap-4 md:grid-cols-2">
        <Field
          label={t.onboarding.vat}
          htmlFor="vatNumber"
          help="Ο 9-ψήφιος ΑΦΜ της επιχείρησής σου. Πρέπει να ταιριάζει με αυτόν που έχεις δηλώσει στην ΑΑΔΕ — αλλιώς η Wrapp θα απορρίψει τα παραστατικά."
        >
          <Input
            id="vatNumber"
            name="vatNumber"
            defaultValue={initial.vatNumber}
            required
            maxLength={20}
          />
        </Field>
        <Field
          label={t.onboarding.taxOffice}
          htmlFor="taxOffice"
          help="Δημόσια Οικονομική Υπηρεσία στην οποία υπάγεσαι (π.χ. «Α΄ Θεσσαλονίκης»). Εμφανίζεται στα παραστατικά."
        >
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
          help="Η επίσημη επωνυμία της επιχείρησης όπως αποδίδεται στην έναρξη ΑΑΔΕ. Ατομικές: ονοματεπώνυμο. Εταιρίες: πλήρης νομική επωνυμία."
        >
          <Input
            id="legalName"
            name="legalName"
            defaultValue={initial.legalName}
            required
            maxLength={160}
          />
        </Field>
        <Field
          label={t.onboarding.tradeName}
          htmlFor="tradeName"
          help="Το εμπορικό όνομα (brand) με το οποίο σε ξέρουν οι πελάτες σου, αν διαφέρει από τη νόμιμη επωνυμία."
        >
          <Input
            id="tradeName"
            name="tradeName"
            defaultValue={initial.tradeName ?? ""}
            maxLength={160}
          />
        </Field>
        <Field
          label={t.onboarding.activity}
          htmlFor="activity"
          help="Η κύρια δραστηριότητά σου (π.χ. «Παροχή συμβουλευτικών υπηρεσιών IT»)."
        >
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
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={10}
            maxLength={5000}
            placeholder={
              "π.χ.\nΤράπεζα Πειραιώς — IBAN: GR12 3456 7890\nΠληρωμή εντός 30 ημερών.\nΕυχαριστούμε για τη συνεργασία."
            }
          />
          <p className="mt-2 text-xs text-ink-500">
            Οι σημειώσεις αποστέλλονται όπως ακριβώς στη Wrapp και τυπώνονται στο τελικό PDF.
          </p>
        </Field>
      </section>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} icon={Save}>
          {pending ? t.common.loading : t.common.save}
        </Button>
      </div>
    </form>
  );
}

