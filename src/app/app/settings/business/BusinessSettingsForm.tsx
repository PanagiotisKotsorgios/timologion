"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
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

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} icon={Save}>
          {pending ? t.common.loading : t.common.save}
        </Button>
      </div>
    </form>
  );
}
