"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, X, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { quickCreateClientAction } from "@/app/app/clients/actions";

export type CreatedClientPayload = {
  id: string;
  label: string;
  vatNumber: string | null;
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
    addressLine: "",
    city: "",
    postalCode: "",
    email: "",
    phone: "",
    notes: "",
  });

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
        taxOffice: values.taxOffice || null,
        addressLine: values.addressLine || null,
        city: values.city || null,
        postalCode: values.postalCode || null,
        country: "GR",
        activity: null,
        email: values.email || null,
        phone: values.phone || null,
      });
      setOpen(false);
      setValues({
        legalName: "",
        vatNumber: "",
        tradeName: "",
        taxOffice: "",
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
                <Field label="ΑΦΜ" htmlFor="qa-vat">
                  <Input
                    id="qa-vat"
                    value={values.vatNumber}
                    onChange={(e) => set("vatNumber", e.target.value)}
                    maxLength={20}
                  />
                </Field>
                <Field
                  label="Νόμιμη επωνυμία"
                  htmlFor="qa-legalName"
                  className="md:col-span-2"
                  required
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

                <Field label="Διακριτικός τίτλος" htmlFor="qa-tradeName">
                  <Input
                    id="qa-tradeName"
                    value={values.tradeName}
                    onChange={(e) => set("tradeName", e.target.value)}
                    maxLength={160}
                  />
                </Field>
                <Field label="ΔΟΥ" htmlFor="qa-taxOffice">
                  <Input
                    id="qa-taxOffice"
                    value={values.taxOffice}
                    onChange={(e) => set("taxOffice", e.target.value)}
                    maxLength={120}
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
