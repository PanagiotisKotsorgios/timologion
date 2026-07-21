"use client";

import { useActionState } from "react";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { t } from "@/lib/i18n";
import { createBusinessAction, type OnboardingState } from "./actions";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState<
    OnboardingState,
    FormData
  >(createBusinessAction, undefined);

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}

      <section className="grid gap-4 md:grid-cols-2">
        <Field label={t.onboarding.vat} htmlFor="vatNumber">
          <Input id="vatNumber" name="vatNumber" required maxLength={20} />
        </Field>
        <Field label={t.onboarding.taxOffice} htmlFor="taxOffice">
          <Input id="taxOffice" name="taxOffice" maxLength={120} />
        </Field>
        <Field
          label={t.onboarding.legalName}
          htmlFor="legalName"
          className="md:col-span-2"
        >
          <Input id="legalName" name="legalName" required maxLength={160} />
        </Field>
        <Field label={t.onboarding.tradeName} htmlFor="tradeName">
          <Input id="tradeName" name="tradeName" maxLength={160} />
        </Field>
        <Field label={t.onboarding.activity} htmlFor="activity">
          <Input id="activity" name="activity" maxLength={200} />
        </Field>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Field
          label={t.onboarding.address}
          htmlFor="addressLine"
          className="md:col-span-2"
        >
          <Input id="addressLine" name="addressLine" maxLength={200} />
        </Field>
        <Field label={t.onboarding.city} htmlFor="city">
          <Input id="city" name="city" maxLength={80} />
        </Field>
        <Field label={t.onboarding.postalCode} htmlFor="postalCode">
          <Input id="postalCode" name="postalCode" maxLength={20} />
        </Field>
        <Field label={t.onboarding.phone} htmlFor="phone">
          <Input id="phone" name="phone" maxLength={30} />
        </Field>
        <Field label={t.onboarding.email} htmlFor="email">
          <Input id="email" name="email" type="email" maxLength={160} />
        </Field>
      </section>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending} icon={Rocket}>
          {pending ? t.common.loading : t.onboarding.submit}
        </Button>
      </div>
    </form>
  );
}
