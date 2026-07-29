"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { Save, Plus, Search, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { PhoneField } from "@/components/ui/PhoneField";
import { EmailField } from "@/components/ui/EmailField";
import { t } from "@/lib/i18n";
import {
  createClientAction,
  updateClientAction,
  vatSearchAction,
  type ClientFormState,
} from "./actions";

type ClientLike = {
  id?: string;
  vatNumber?: string | null;
  legalName?: string;
  tradeName?: string | null;
  taxOffice?: string | null;
  activity?: string | null;
  addressLine?: string | null;
  city?: string | null;
  postalCode?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
};

export function ClientForm({
  initial,
  mode,
}: {
  initial?: ClientLike;
  mode: "create" | "edit";
}) {
  const action =
    mode === "create"
      ? createClientAction
      : (updateClientAction.bind(null, initial!.id!) as typeof createClientAction);

  const [state, formAction, pending] = useActionState<ClientFormState, FormData>(
    action,
    undefined,
  );

  const [values, setValues] = useState({
    vatNumber: initial?.vatNumber ?? "",
    legalName: initial?.legalName ?? "",
    tradeName: initial?.tradeName ?? "",
    taxOffice: initial?.taxOffice ?? "",
    activity: initial?.activity ?? "",
    addressLine: initial?.addressLine ?? "",
    city: initial?.city ?? "",
    postalCode: initial?.postalCode ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    notes: initial?.notes ?? "",
  });

  const [vatMessage, setVatMessage] = useState<string | null>(null);
  const [vatNeedsAade, setVatNeedsAade] = useState(false);
  const [vatBusy, startVat] = useTransition();

  function set<K extends keyof typeof values>(
    key: K,
    v: (typeof values)[K],
  ) {
    setValues((s) => ({ ...s, [key]: v }));
  }

  function handleVatLookup() {
    setVatMessage(null);
    setVatNeedsAade(false);
    const vat = values.vatNumber?.trim();
    if (!vat) {
      setVatMessage("Πληκτρολόγησε πρώτα ΑΦΜ.");
      return;
    }
    const fd = new FormData();
    fd.set("vat", vat);
    startVat(async () => {
      const res = await vatSearchAction(fd);
      if (!res.ok) {
        setVatMessage(res.error);
        if ("code" in res && res.code === "aade_credentials_missing") {
          setVatNeedsAade(true);
        }
        return;
      }
      setValues((s) => ({
        ...s,
        vatNumber: res.result.vat,
        legalName: res.result.legal_name,
        tradeName: res.result.trade_name ?? s.tradeName,
        taxOffice: res.result.tax_office ?? s.taxOffice,
        activity: res.result.activity ?? s.activity,
        addressLine: res.result.address ?? s.addressLine,
        city: res.result.city ?? s.city,
        postalCode: res.result.postal_code ?? s.postalCode,
        // Prefer the fetched values, but only overwrite if the user hasn't
        // already typed something. Phone/email are frequently blank in
        // the ΑΦΜ registry so we don't want to wipe a good manual value.
        phone: s.phone || res.result.phone || "",
        email: s.email || res.result.email || "",
      }));
      // Rough count of what actually got populated — helpful UX signal so
      // the user knows if we just filled name+city vs a full record.
      const filled = [
        res.result.legal_name,
        res.result.trade_name,
        res.result.tax_office,
        res.result.activity,
        res.result.address,
        res.result.city,
        res.result.postal_code,
        res.result.phone,
        res.result.email,
      ].filter(Boolean).length;
      setVatMessage(
        `Συμπληρώθηκαν ${filled} πεδία από την αναζήτηση ΑΦΜ.`,
      );
    });
  }

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}

      <section className="grid gap-4 md:grid-cols-3">
        <Field
          label="ΑΦΜ"
          htmlFor="vatNumber"
          help="Ο 9-ψήφιος Αριθμός Φορολογικού Μητρώου του πελάτη. Πάτα «Αναζήτηση» για αυτόματη συμπλήρωση επωνυμίας, ΔΟΥ, διεύθυνσης και δραστηριότητας από την ΑΑΔΕ."
        >
          <div className="flex gap-2">
            <Input
              id="vatNumber"
              name="vatNumber"
              value={values.vatNumber ?? ""}
              onChange={(e) => set("vatNumber", e.target.value)}
              maxLength={20}
            />
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleVatLookup}
              disabled={vatBusy}
              icon={vatBusy ? Loader2 : Search}
              className={vatBusy ? "[&_svg]:animate-spin" : ""}
            >
              {vatBusy ? "Αναζήτηση..." : "Αναζήτηση"}
            </Button>
          </div>
        </Field>
        <Field
          label="Νόμιμη επωνυμία"
          htmlFor="legalName"
          className="md:col-span-2"
          help="Η επίσημη επωνυμία της επιχείρησης όπως εμφανίζεται στο μητρώο ΑΑΔΕ. Για ιδιώτες, βάλε ονοματεπώνυμο."
        >
          <Input
            id="legalName"
            name="legalName"
            required
            value={values.legalName ?? ""}
            onChange={(e) => set("legalName", e.target.value)}
            maxLength={160}
          />
        </Field>
      </section>

      {vatMessage && (
        <Alert tone={vatMessage.startsWith("Συμπ") ? "success" : "warning"}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{vatMessage}</span>
            {vatNeedsAade && (
              <Link
                href="/app/settings/aade"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-900 px-4 text-sm font-bold text-white hover:bg-black"
              >
                <KeyRound size={14} aria-hidden />
                Ρύθμιση ΓΓΠΣ
              </Link>
            )}
          </div>
        </Alert>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <Field
          label="Διακριτικός τίτλος"
          htmlFor="tradeName"
          help="Το εμπορικό όνομα με το οποίο ο πελάτης είναι γνωστός στην αγορά, αν διαφέρει από τη νόμιμη επωνυμία."
        >
          <Input
            id="tradeName"
            name="tradeName"
            value={values.tradeName ?? ""}
            onChange={(e) => set("tradeName", e.target.value)}
            maxLength={160}
          />
        </Field>
        <Field
          label="ΔΟΥ"
          htmlFor="taxOffice"
          help="Δημόσια Οικονομική Υπηρεσία στην οποία υπάγεται φορολογικά ο πελάτης (π.χ. «Α΄ Αθηνών», «ΙΓ΄ Αθηνών»)."
        >
          <Input
            id="taxOffice"
            name="taxOffice"
            value={values.taxOffice ?? ""}
            onChange={(e) => set("taxOffice", e.target.value)}
            maxLength={120}
          />
        </Field>
        <Field
          label="Δραστηριότητα"
          htmlFor="activity"
          className="md:col-span-2"
          help="Κύρια οικονομική δραστηριότητα (π.χ. «Λιανικό εμπόριο ενδυμάτων», «Παροχή λογιστικών υπηρεσιών»)."
        >
          <Input
            id="activity"
            name="activity"
            value={values.activity ?? ""}
            onChange={(e) => set("activity", e.target.value)}
            maxLength={200}
          />
        </Field>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Field label="Διεύθυνση" htmlFor="addressLine" className="md:col-span-2">
          <Input
            id="addressLine"
            name="addressLine"
            value={values.addressLine ?? ""}
            onChange={(e) => set("addressLine", e.target.value)}
            maxLength={200}
          />
        </Field>
        <Field label="Πόλη" htmlFor="city">
          <Input
            id="city"
            name="city"
            value={values.city ?? ""}
            onChange={(e) => set("city", e.target.value)}
            maxLength={80}
          />
        </Field>
        <Field label="Τ.Κ." htmlFor="postalCode">
          <Input
            id="postalCode"
            name="postalCode"
            value={values.postalCode ?? ""}
            onChange={(e) => set("postalCode", e.target.value)}
            maxLength={20}
          />
        </Field>
        <EmailField
          htmlFor="email"
          name="email"
          value={values.email ?? ""}
          onChange={(v) => set("email", v)}
        />
        <PhoneField
          label="Τηλέφωνο"
          htmlFor="phone"
          name="phone"
          value={values.phone ?? ""}
          onChange={(v) => set("phone", v)}
          help="Επίλεξε τον κωδικό χώρας από τη λίστα (προεπιλογή Ελλάδα +30) και συμπλήρωσε τον αριθμό."
        />
      </section>

      <Field label="Σημειώσεις" htmlFor="notes">
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          value={values.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          maxLength={5000}
        />
      </Field>

      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          disabled={pending}
          icon={mode === "create" ? Plus : Save}
        >
          {pending
            ? t.common.loading
            : mode === "create"
              ? t.common.create
              : t.common.save}
        </Button>
      </div>
    </form>
  );
}
