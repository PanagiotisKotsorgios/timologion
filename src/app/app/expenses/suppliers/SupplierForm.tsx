"use client";

import { useActionState, useState } from "react";
import { Save, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import {
  createSupplierAction,
  updateSupplierAction,
  type SupplierFormState,
} from "../actions";

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

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}

      <section className="grid gap-4 md:grid-cols-3">
        <Field label="ΑΦΜ" htmlFor="vatNumber">
          <Input
            id="vatNumber"
            name="vatNumber"
            value={values.vatNumber}
            onChange={(e) => set("vatNumber", e.target.value)}
            maxLength={20}
          />
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
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            maxLength={160}
          />
        </Field>
        <Field label="Τηλέφωνο" htmlFor="phone">
          <Input
            id="phone"
            name="phone"
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
            maxLength={30}
          />
        </Field>
      </section>

      <Field label="IBAN" htmlFor="iban">
        <Input
          id="iban"
          name="iban"
          value={values.iban}
          onChange={(e) => set("iban", e.target.value)}
          maxLength={40}
          placeholder="GR16 0110 1250 0000 0001 2300 695"
        />
      </Field>

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
