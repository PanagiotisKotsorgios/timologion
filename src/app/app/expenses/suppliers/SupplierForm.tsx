"use client";

import { useActionState, useState, useTransition } from "react";
import { Save, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { PhoneField } from "@/components/ui/PhoneField";
import { IbanField } from "@/components/ui/IbanField";
import { EmailField } from "@/components/ui/EmailField";
import {
  createSupplierAction,
  updateSupplierAction,
  type SupplierFormState,
} from "../actions";
// Reuse the same lookup the client + document editor use — a
// registry lookup is registry-agnostic re: what the caller intends to
// do with the row. See src/app/app/clients/actions.ts, where the
// permission gate was relaxed to any tenant user for this reason.
import { vatSearchAction } from "@/app/app/clients/actions";

type SupplierLike = {
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
  iban?: string | null;
  notes?: string | null;
};

export function SupplierForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: SupplierLike;
}) {
  const action =
    mode === "create"
      ? createSupplierAction
      : (updateSupplierAction.bind(null, initial!.id!) as typeof createSupplierAction);

  const [state, formAction, pending] = useActionState<
    SupplierFormState,
    FormData
  >(action, undefined);

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
    iban: initial?.iban ?? "",
    notes: initial?.notes ?? "",
  });

  function set<K extends keyof typeof values>(
    key: K,
    v: (typeof values)[K],
  ) {
    setValues((s) => ({ ...s, [key]: v }));
  }

  const [vatBusy, startVat] = useTransition();
  const [vatMessage, setVatMessage] = useState<string | null>(null);

  function runVatSearch() {
    setVatMessage(null);
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
        return;
      }
      // Preserve any manual values the user already typed — the
      // registry only fills empty fields (except vatNumber +
      // legalName which are canonical from the search).
      setValues((s) => ({
        ...s,
        vatNumber: res.result.vat,
        legalName: res.result.legal_name,
        tradeName: s.tradeName || res.result.trade_name || "",
        taxOffice: s.taxOffice || res.result.tax_office || "",
        activity: s.activity || res.result.activity || "",
        addressLine: s.addressLine || res.result.address || "",
        city: s.city || res.result.city || "",
        postalCode: s.postalCode || res.result.postal_code || "",
        phone: s.phone || res.result.phone || "",
        email: s.email || res.result.email || "",
      }));
      const filledLabels: string[] = ["Επωνυμία"];
      if (res.result.trade_name) filledLabels.push("Διακριτικός τίτλος");
      if (res.result.tax_office) filledLabels.push("ΔΟΥ");
      if (res.result.activity) filledLabels.push("Δραστηριότητα");
      if (res.result.address) filledLabels.push("Διεύθυνση");
      if (res.result.city) filledLabels.push("Πόλη");
      if (res.result.postal_code) filledLabels.push("Τ.Κ.");
      if (res.result.phone) filledLabels.push("Τηλέφωνο");
      if (res.result.email) filledLabels.push("Email");
      setVatMessage(
        `Συμπληρώθηκαν: ${filledLabels.join(", ")}. Έλεγξε και συμπλήρωσε τα υπόλοιπα χειροκίνητα.`,
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
          help="Πάτα «Αναζήτηση» για αυτόματη συμπλήρωση επωνυμίας, ΔΟΥ, διεύθυνσης και δραστηριότητας από την ΑΑΔΕ."
        >
          <div className="flex gap-2">
            <Input
              id="vatNumber"
              name="vatNumber"
              value={values.vatNumber}
              onChange={(e) => set("vatNumber", e.target.value)}
              maxLength={9}
              inputMode="numeric"
            />
            <Button
              type="button"
              variant="secondary"
              size="md"
              icon={Search}
              onClick={runVatSearch}
              disabled={vatBusy}
            >
              {vatBusy ? "Αναζήτηση..." : "Αναζήτηση"}
            </Button>
          </div>
          {vatMessage && (
            <p className="mt-2 text-xs font-medium text-brand-900">
              {vatMessage}
            </p>
          )}
        </Field>
        <Field
          label="Νόμιμη επωνυμία"
          htmlFor="legalName"
          className="md:col-span-2"
          required
        >
          <Input
            id="legalName"
            name="legalName"
            required
            value={values.legalName}
            onChange={(e) => set("legalName", e.target.value)}
            maxLength={160}
          />
        </Field>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Field label="Διακριτικός τίτλος" htmlFor="tradeName">
          <Input
            id="tradeName"
            name="tradeName"
            value={values.tradeName}
            onChange={(e) => set("tradeName", e.target.value)}
            maxLength={160}
          />
        </Field>
        <Field label="ΔΟΥ" htmlFor="taxOffice">
          <Input
            id="taxOffice"
            name="taxOffice"
            value={values.taxOffice}
            onChange={(e) => set("taxOffice", e.target.value)}
            maxLength={120}
          />
        </Field>
        <Field label="Δραστηριότητα" htmlFor="activity" className="md:col-span-2">
          <Input
            id="activity"
            name="activity"
            value={values.activity}
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
            value={values.addressLine}
            onChange={(e) => set("addressLine", e.target.value)}
            maxLength={200}
          />
        </Field>
        <Field label="Πόλη" htmlFor="city">
          <Input
            id="city"
            name="city"
            value={values.city}
            onChange={(e) => set("city", e.target.value)}
            maxLength={80}
          />
        </Field>
        <Field label="Τ.Κ." htmlFor="postalCode">
          <Input
            id="postalCode"
            name="postalCode"
            value={values.postalCode}
            onChange={(e) => set("postalCode", e.target.value)}
            maxLength={20}
          />
        </Field>
        <EmailField
          htmlFor="email"
          name="email"
          value={values.email}
          onChange={(v) => set("email", v)}
        />
        <PhoneField
          label="Τηλέφωνο"
          htmlFor="phone"
          name="phone"
          value={values.phone}
          onChange={(v) => set("phone", v)}
          help="Επίλεξε τον κωδικό χώρας από τη λίστα (προεπιλογή Ελλάδα +30) και συμπλήρωσε τον αριθμό. Για ξένους προμηθευτές, επίλεξε την αντίστοιχη χώρα."
        />
      </section>

      <IbanField
        label="IBAN"
        htmlFor="iban"
        name="iban"
        value={values.iban}
        onChange={(v) => set("iban", v)}
        help="Επίλεξε τη χώρα του τραπεζικού λογαριασμού και συμπλήρωσε τον IBAN. Το μήκος προσαρμόζεται αυτόματα ανά χώρα (Ελλάδα 27, Γερμανία 22 κ.λπ.)."
      />

      <Field label="Σημειώσεις" htmlFor="notes">
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          value={values.notes}
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
            ? "Αποθήκευση..."
            : mode === "create"
              ? "Δημιουργία"
              : "Αποθήκευση"}
        </Button>
      </div>
    </form>
  );
}
