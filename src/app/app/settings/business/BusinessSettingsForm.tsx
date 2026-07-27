"use client";

import { useActionState, useState } from "react";
import { Save, FileText, Sparkles } from "lucide-react";
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
        <div className="grid gap-6 lg:grid-cols-2">
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

          <InvoiceNotesPreview
            business={initial}
            notes={notes}
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} icon={Save}>
          {pending ? t.common.loading : t.common.save}
        </Button>
      </div>
    </form>
  );
}

/**
 * Simplified visual mock of how the note block appears on the actual
 * Wrapp-issued PDF. Not pixel-perfect — just enough to let the user
 * see how their IBAN / T&Cs / footer will read once the invoice ships,
 * without needing to issue a real draft.
 */
function InvoiceNotesPreview({
  business,
  notes,
}: {
  business: BusinessLike;
  notes: string;
}) {
  const trimmedNotes = notes.trim();
  const today = new Date().toLocaleDateString("el-GR");
  return (
    <div className="rounded-2xl border-2 border-brand-100 bg-brand-50/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-900 text-white">
          <Sparkles size={14} aria-hidden />
        </span>
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-brand-900/70">
            Προεπισκόπηση παραστατικού
          </p>
          <p className="text-xs text-ink-700">
            Έτσι θα φαίνονται οι σημειώσεις όταν εκδοθούν μέσω Wrapp.
          </p>
        </div>
      </div>

      <div className="rounded-xl border-2 border-ink-300 bg-white shadow-inner">
        {/* Faux invoice header */}
        <div className="border-b border-ink-300 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-ink-500">
                Εκδότης
              </p>
              <p className="mt-0.5 text-sm font-extrabold text-ink-900">
                {business.legalName || "Η επιχείρησή σου"}
              </p>
              <p className="text-[11px] text-ink-700">
                ΑΦΜ {business.vatNumber || "—"}
              </p>
              {(business.addressLine || business.city) && (
                <p className="text-[11px] text-ink-700">
                  {[business.addressLine, business.postalCode, business.city]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-ink-500">
                Τιμολόγιο
              </p>
              <p className="text-sm font-extrabold text-ink-900">A #123</p>
              <p className="text-[11px] text-ink-700">{today}</p>
            </div>
          </div>

          <div className="mt-3 rounded-md bg-ink-100 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-ink-500">
              Πελάτης
            </p>
            <p className="text-sm font-bold text-ink-900">Ονομα Πελάτη ΑΕ</p>
            <p className="text-[11px] text-ink-700">ΑΦΜ 999999999</p>
          </div>
        </div>

        {/* Faux lines */}
        <div className="px-5 py-3 text-[11px]">
          <div className="grid grid-cols-[1fr_60px_80px] gap-2 border-b border-ink-200 pb-1.5 font-bold uppercase tracking-wider text-ink-500">
            <span>Περιγραφή</span>
            <span className="text-right">Ποσ.</span>
            <span className="text-right">Αξία</span>
          </div>
          <div className="grid grid-cols-[1fr_60px_80px] gap-2 py-1.5">
            <span className="text-ink-900">Υπηρεσία / προϊόν</span>
            <span className="text-right tabular-nums text-ink-700">1</span>
            <span className="text-right tabular-nums font-semibold text-ink-900">
              100,00 €
            </span>
          </div>
        </div>

        {/* Faux totals */}
        <div className="border-t border-ink-200 px-5 py-3 text-[11px]">
          <div className="flex justify-between text-ink-700">
            <span>Καθαρή αξία</span>
            <span className="tabular-nums">100,00 €</span>
          </div>
          <div className="flex justify-between text-ink-700">
            <span>ΦΠΑ 24%</span>
            <span className="tabular-nums">24,00 €</span>
          </div>
          <div className="mt-1.5 flex justify-between border-t-2 border-ink-300 pt-1.5 text-sm font-extrabold text-brand-900">
            <span>Σύνολο</span>
            <span className="tabular-nums">124,00 €</span>
          </div>
        </div>

        {/* The notes block — this is what we're actually previewing */}
        <div className="relative border-t-2 border-brand-200 bg-amber-50/70 px-5 py-4">
          <span className="absolute -top-3 left-4 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm">
            <FileText size={10} aria-hidden />
            Σημειώσεις σου
          </span>
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-amber-900/80">
            Σημειώσεις
          </p>
          {trimmedNotes ? (
            <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-ink-900">
              {trimmedNotes}
            </p>
          ) : (
            <p className="text-[12px] italic text-ink-500">
              Άδειο — γράψε παραπάνω για να δεις πώς θα φαίνονται τα σχόλιά σου εδώ.
            </p>
          )}
        </div>

        {/* Faux footer */}
        <div className="border-t border-ink-300 bg-ink-50 px-5 py-2 text-[9px] uppercase tracking-widest text-ink-500">
          MARK 400000012345678 · UID a1b2c3
        </div>
      </div>
    </div>
  );
}
