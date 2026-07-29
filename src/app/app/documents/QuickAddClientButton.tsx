"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, X, UserPlus, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import {
  quickCreateClientAction,
  vatSearchAction,
} from "@/app/app/clients/actions";

export type CreatedClientPayload = {
  id: string;
  label: string;
  vatNumber: string | null;
  tradeName: string | null;
  taxOffice: string | null;
  addressLine: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  activity: string | null;
  email: string | null;
  phone: string | null;
};

/**
 * "Νέος πελάτης" shortcut for the DraftEditor and any other form that
 * would otherwise send the user off to /app/clients/new and lose the
 * work-in-progress. Opens a modal, calls the quick-create action, then
 * hands the freshly minted client back to the parent so it can drop
 * it into its picker state and auto-select it.
 */
export function QuickAddClientButton({
  onCreated,
}: {
  onCreated: (client: CreatedClientPayload) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTx] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [values, setValues] = useState({
    legalName: "",
    vatNumber: "",
    tradeName: "",
    taxOffice: "",
    activity: "",
    addressLine: "",
    city: "",
    postalCode: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [vatBusy, startVatSearch] = useTransition();
  const [vatMessage, setVatMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, pending]);

  function set<K extends keyof typeof values>(
    key: K,
    v: (typeof values)[K],
  ) {
    setValues((s) => ({ ...s, [key]: v }));
  }

  function handleVatLookup() {
    const vat = values.vatNumber.trim();
    if (!vat) {
      setVatMessage("Πληκτρολόγησε ΑΦΜ πρώτα.");
      return;
    }
    setVatMessage(null);
    setError(null);
    const fd = new FormData();
    fd.set("vat", vat);
    startVatSearch(async () => {
      const res = await vatSearchAction(fd);
      if (!res.ok) {
        setVatMessage(res.error);
        return;
      }
      // Auto-fill from ΑΑΔΕ / provider result. Preserve any values the
      // user already typed manually — the fetched data only overwrites
      // empty fields (except vatNumber + legalName which are canonical).
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
      const filled = [
        res.result.trade_name,
        res.result.tax_office,
        res.result.activity,
        res.result.address,
        res.result.city,
        res.result.postal_code,
        res.result.phone,
        res.result.email,
      ].filter(Boolean).length;
      setVatMessage(`Συμπληρώθηκαν ${filled} πεδία από την αναζήτηση ΑΦΜ.`);
    });
  }

  function submit() {
    if (!values.legalName.trim()) {
      setError("Η νόμιμη επωνυμία είναι υποχρεωτική.");
      return;
    }
    setError(null);
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => fd.set(k, v));
    startTx(async () => {
      const res = await quickCreateClientAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onCreated({
        id: res.id,
        label: res.label,
        vatNumber: res.vatNumber,
        tradeName: values.tradeName || null,
        taxOffice: values.taxOffice || null,
        addressLine: values.addressLine || null,
        city: values.city || null,
        postalCode: values.postalCode || null,
        country: "GR",
        activity: values.activity || null,
        email: values.email || null,
        phone: values.phone || null,
      });
      setOpen(false);
      setVatMessage(null);
      setValues({
        legalName: "",
        vatNumber: "",
        tradeName: "",
        taxOffice: "",
        activity: "",
        addressLine: "",
        city: "",
        postalCode: "",
        email: "",
        phone: "",
        notes: "",
      });
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink-900 bg-white px-3 py-1.5 text-sm font-bold text-ink-900 transition-colors hover:bg-ink-900 hover:text-white"
      >
        <Plus size={14} strokeWidth={2.5} aria-hidden />
        Νέος πελάτης
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-add-client-title"
          className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto p-4 py-10 sm:p-8"
        >
          <button
            type="button"
            aria-label="Κλείσιμο"
            onClick={() => !pending && setOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-ink-300/70 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-ink-300/60 px-8 py-6">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-800">
                  <UserPlus size={22} aria-hidden />
                </div>
                <div>
                  <h2
                    id="quick-add-client-title"
                    className="text-2xl font-extrabold text-brand-900 md:text-3xl"
                  >
                    Νέος πελάτης
                  </h2>
                  <p className="mt-1 text-sm text-ink-700">
                    Γρήγορη προσθήκη — μπορείς να συμπληρώσεις τα υπόλοιπα
                    στοιχεία αργότερα.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Κλείσιμο"
                onClick={() => !pending && setOpen(false)}
                disabled={pending}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-8 py-6">
              {error && <Alert tone="danger">{error}</Alert>}

              <div className="grid gap-4 md:grid-cols-3">
                <Field
                  label="ΑΦΜ"
                  htmlFor="qa-vat"
                  help="Ο 9-ψήφιος Αριθμός Φορολογικού Μητρώου του πελάτη. Πάτα «Αναζήτηση» για αυτόματη συμπλήρωση επωνυμίας, ΔΟΥ, διεύθυνσης και δραστηριότητας."
                >
                  <div className="flex gap-2">
                    <Input
                      id="qa-vat"
                      value={values.vatNumber}
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
                      {vatBusy ? "..." : "Αναζήτηση"}
                    </Button>
                  </div>
                </Field>
                <Field
                  label="Νόμιμη επωνυμία"
                  htmlFor="qa-legalName"
                  className="md:col-span-2"
                  required
                  help="Η επίσημη επωνυμία της επιχείρησης όπως εμφανίζεται στο μητρώο ΑΑΔΕ. Για ιδιώτες, συμπλήρωσε ονοματεπώνυμο."
                >
                  <Input
                    id="qa-legalName"
                    value={values.legalName}
                    onChange={(e) => set("legalName", e.target.value)}
                    autoFocus
                    required
                    maxLength={160}
                  />
                </Field>
              </div>

              {vatMessage && (
                <Alert tone={vatMessage.startsWith("Συμπ") ? "success" : "warning"}>
                  {vatMessage}
                </Alert>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                <Field
                  label="Διακριτικός τίτλος"
                  htmlFor="qa-tradeName"
                  help="Το εμπορικό όνομα με το οποίο ο πελάτης είναι γνωστός στην αγορά, αν διαφέρει από τη νόμιμη επωνυμία."
                >
                  <Input
                    id="qa-tradeName"
                    value={values.tradeName}
                    onChange={(e) => set("tradeName", e.target.value)}
                    maxLength={160}
                  />
                </Field>
                <Field
                  label="ΔΟΥ"
                  htmlFor="qa-taxOffice"
                  help="Δημόσια Οικονομική Υπηρεσία στην οποία υπάγεται φορολογικά ο πελάτης (π.χ. «Α΄ Αθηνών»)."
                >
                  <Input
                    id="qa-taxOffice"
                    value={values.taxOffice}
                    onChange={(e) => set("taxOffice", e.target.value)}
                    maxLength={120}
                  />
                </Field>
                <Field
                  label="Δραστηριότητα"
                  htmlFor="qa-activity"
                  help="Κύρια οικονομική δραστηριότητα (π.χ. «Λιανικό εμπόριο ενδυμάτων», «Παροχή λογιστικών υπηρεσιών»)."
                >
                  <Input
                    id="qa-activity"
                    value={values.activity}
                    onChange={(e) => set("activity", e.target.value)}
                    maxLength={200}
                  />
                </Field>
                <Field label="Τηλέφωνο" htmlFor="qa-phone">
                  <Input
                    id="qa-phone"
                    value={values.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    maxLength={30}
                  />
                </Field>

                <Field
                  label="Διεύθυνση"
                  htmlFor="qa-address"
                  className="md:col-span-2"
                >
                  <Input
                    id="qa-address"
                    value={values.addressLine}
                    onChange={(e) => set("addressLine", e.target.value)}
                    maxLength={200}
                  />
                </Field>
                <Field label="Τ.Κ." htmlFor="qa-postal">
                  <Input
                    id="qa-postal"
                    value={values.postalCode}
                    onChange={(e) => set("postalCode", e.target.value)}
                    maxLength={20}
                  />
                </Field>

                <Field label="Πόλη" htmlFor="qa-city">
                  <Input
                    id="qa-city"
                    value={values.city}
                    onChange={(e) => set("city", e.target.value)}
                    maxLength={80}
                  />
                </Field>
                <Field
                  label="Email"
                  htmlFor="qa-email"
                  className="md:col-span-2"
                >
                  <Input
                    id="qa-email"
                    type="email"
                    value={values.email}
                    onChange={(e) => set("email", e.target.value)}
                    maxLength={160}
                  />
                </Field>
              </div>

              <Field label="Σημειώσεις" htmlFor="qa-notes">
                <Textarea
                  id="qa-notes"
                  rows={2}
                  value={values.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  maxLength={2000}
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Άκυρο
                </Button>
                <Button
                  type="button"
                  onClick={submit}
                  icon={Plus}
                  disabled={pending || !values.legalName.trim()}
                >
                  {pending ? "Προσθήκη..." : "Προσθήκη πελάτη"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
