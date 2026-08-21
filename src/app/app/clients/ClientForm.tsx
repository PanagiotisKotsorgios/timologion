"use client";

import { useActionState, useState, useTransition } from "react";
import { Save, Plus, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
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
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
};

// ISO-3166 alpha-2 country codes surfaced in the dropdown. GR is the
// default. The 26 EU members are grouped first (needed for
// intracommunity 1.2/2.2 invoices), then common non-EU countries
// (needed for third-country 1.3/2.3 invoices). A user can still type
// any 2-letter code manually if their partner isn't in the list.
const COUNTRY_OPTIONS: { code: string; label: string; group: string }[] = [
  { code: "GR", label: "Ελλάδα (GR)", group: "Ελλάδα" },
  { code: "AT", label: "Αυστρία (AT)", group: "Ε.Ε." },
  { code: "BE", label: "Βέλγιο (BE)", group: "Ε.Ε." },
  { code: "BG", label: "Βουλγαρία (BG)", group: "Ε.Ε." },
  { code: "HR", label: "Κροατία (HR)", group: "Ε.Ε." },
  { code: "CY", label: "Κύπρος (CY)", group: "Ε.Ε." },
  { code: "CZ", label: "Τσεχία (CZ)", group: "Ε.Ε." },
  { code: "DK", label: "Δανία (DK)", group: "Ε.Ε." },
  { code: "EE", label: "Εσθονία (EE)", group: "Ε.Ε." },
  { code: "FI", label: "Φινλανδία (FI)", group: "Ε.Ε." },
  { code: "FR", label: "Γαλλία (FR)", group: "Ε.Ε." },
  { code: "DE", label: "Γερμανία (DE)", group: "Ε.Ε." },
  { code: "HU", label: "Ουγγαρία (HU)", group: "Ε.Ε." },
  { code: "IE", label: "Ιρλανδία (IE)", group: "Ε.Ε." },
  { code: "IT", label: "Ιταλία (IT)", group: "Ε.Ε." },
  { code: "LV", label: "Λετονία (LV)", group: "Ε.Ε." },
  { code: "LT", label: "Λιθουανία (LT)", group: "Ε.Ε." },
  { code: "LU", label: "Λουξεμβούργο (LU)", group: "Ε.Ε." },
  { code: "MT", label: "Μάλτα (MT)", group: "Ε.Ε." },
  { code: "NL", label: "Ολλανδία (NL)", group: "Ε.Ε." },
  { code: "PL", label: "Πολωνία (PL)", group: "Ε.Ε." },
  { code: "PT", label: "Πορτογαλία (PT)", group: "Ε.Ε." },
  { code: "RO", label: "Ρουμανία (RO)", group: "Ε.Ε." },
  { code: "SK", label: "Σλοβακία (SK)", group: "Ε.Ε." },
  { code: "SI", label: "Σλοβενία (SI)", group: "Ε.Ε." },
  { code: "ES", label: "Ισπανία (ES)", group: "Ε.Ε." },
  { code: "SE", label: "Σουηδία (SE)", group: "Ε.Ε." },
  { code: "GB", label: "Ην. Βασίλειο (GB)", group: "Τρίτες χώρες" },
  { code: "CH", label: "Ελβετία (CH)", group: "Τρίτες χώρες" },
  { code: "NO", label: "Νορβηγία (NO)", group: "Τρίτες χώρες" },
  { code: "US", label: "ΗΠΑ (US)", group: "Τρίτες χώρες" },
  { code: "CA", label: "Καναδάς (CA)", group: "Τρίτες χώρες" },
  { code: "AU", label: "Αυστραλία (AU)", group: "Τρίτες χώρες" },
  { code: "TR", label: "Τουρκία (TR)", group: "Τρίτες χώρες" },
  { code: "AL", label: "Αλβανία (AL)", group: "Τρίτες χώρες" },
  { code: "MK", label: "Βόρεια Μακεδονία (MK)", group: "Τρίτες χώρες" },
  { code: "RS", label: "Σερβία (RS)", group: "Τρίτες χώρες" },
  { code: "IL", label: "Ισραήλ (IL)", group: "Τρίτες χώρες" },
  { code: "AE", label: "Ην. Αραβικά Εμιράτα (AE)", group: "Τρίτες χώρες" },
  { code: "CN", label: "Κίνα (CN)", group: "Τρίτες χώρες" },
  { code: "JP", label: "Ιαπωνία (JP)", group: "Τρίτες χώρες" },
];

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
    country: initial?.country ?? "GR",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    notes: initial?.notes ?? "",
  });

  const [vatMessage, setVatMessage] = useState<string | null>(null);
  const [vatBusy, startVat] = useTransition();

  function set<K extends keyof typeof values>(
    key: K,
    v: (typeof values)[K],
  ) {
    setValues((s) => ({ ...s, [key]: v }));
  }

  function handleVatLookup() {
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
      // Report which specific fields the registry populated. Being
      // explicit prevents the "why only 4 πεδία?" confusion —
      // registries (Wrapp / ΑΑΔΕ) genuinely don't have email + phone
      // for most ΑΦΜs, and knowing which fields are auto-filled tells
      // the user exactly what they still need to complete by hand.
      const filledLabels: string[] = [];
      if (res.result.legal_name) filledLabels.push("Επωνυμία");
      if (res.result.trade_name) filledLabels.push("Διακριτικός τίτλος");
      if (res.result.tax_office) filledLabels.push("ΔΟΥ");
      if (res.result.activity) filledLabels.push("Δραστηριότητα");
      if (res.result.address) filledLabels.push("Διεύθυνση");
      if (res.result.city) filledLabels.push("Πόλη");
      if (res.result.postal_code) filledLabels.push("Τ.Κ.");
      if (res.result.phone) filledLabels.push("Τηλέφωνο");
      if (res.result.email) filledLabels.push("Email");
      if (filledLabels.length === 0) {
        setVatMessage(
          "Το ΑΦΜ βρέθηκε αλλά το μητρώο δεν επέστρεψε λεπτομέρειες. Συμπλήρωσε τα υπόλοιπα πεδία χειροκίνητα.",
        );
      } else {
        setVatMessage(
          `Συμπληρώθηκαν αυτόματα: ${filledLabels.join(", ")}. Έλεγξε και συμπλήρωσε τα υπόλοιπα χειροκίνητα.`,
        );
      }
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
              maxLength={9}
              inputMode="numeric"
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
          {vatMessage}
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
        <Field
          label="Χώρα"
          htmlFor="country"
          help="Απαραίτητο για ενδοκοινοτικά τιμολόγια (Ε.Ε. εκτός Ελλάδας) και για παραστατικά τρίτων χωρών."
        >
          <Select
            id="country"
            name="country"
            value={values.country ?? "GR"}
            onChange={(e) => set("country", e.target.value.toUpperCase())}
          >
            {/* Grouped for scannability: Ελλάδα → Ε.Ε. → Τρίτες χώρες. */}
            {(["Ελλάδα", "Ε.Ε.", "Τρίτες χώρες"] as const).map((group) => (
              <optgroup key={group} label={group}>
                {COUNTRY_OPTIONS.filter((c) => c.group === group).map(
                  (c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ),
                )}
              </optgroup>
            ))}
          </Select>
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
