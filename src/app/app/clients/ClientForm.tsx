"use client";

import { useActionState, useState, useTransition } from "react";
import { Save, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
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
      }));
      setVatMessage("Συμπληρώθηκαν στοιχεία από αναζήτηση ΑΦΜ.");
    });
  }

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}

      <section className="grid gap-4 md:grid-cols-3">
        <Field label="ΑΦΜ" htmlFor="vatNumber">
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
              icon={Search}
            >
              {vatBusy ? "..." : "Αναζήτηση"}
            </Button>
          </div>
        </Field>
        <Field
          label="Νόμιμη επωνυμία"
          htmlFor="legalName"
          className="md:col-span-2"
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
        <Field label="Διακριτικός τίτλος" htmlFor="tradeName">
          <Input
            id="tradeName"
            name="tradeName"
            value={values.tradeName ?? ""}
            onChange={(e) => set("tradeName", e.target.value)}
            maxLength={160}
          />
        </Field>
        <Field label="ΔΟΥ" htmlFor="taxOffice">
          <Input
            id="taxOffice"
            name="taxOffice"
            value={values.taxOffice ?? ""}
            onChange={(e) => set("taxOffice", e.target.value)}
            maxLength={120}
          />
        </Field>
        <Field label="Δραστηριότητα" htmlFor="activity" className="md:col-span-2">
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
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            value={values.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
            maxLength={160}
          />
        </Field>
        <Field label="Τηλέφωνο" htmlFor="phone">
          <Input
            id="phone"
            name="phone"
            value={values.phone ?? ""}
            onChange={(e) => set("phone", e.target.value)}
            maxLength={30}
          />
        </Field>
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
