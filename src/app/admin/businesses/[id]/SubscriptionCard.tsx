"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import {
  setSubscriptionAction,
  recordProviderCostAction,
  createPlatformInvoiceAction,
} from "@/app/admin/billing/actions";

type Plan = {
  id: string;
  code: string;
  name: string;
  priceMonthly: string;
  priceYearly: string;
};

export function AssignSubscriptionForm({
  businessId,
  plans,
  currentPlanId,
  currentCycle,
  currentOverride,
}: {
  businessId: string;
  plans: Plan[];
  currentPlanId?: string | null;
  currentCycle?: "monthly" | "yearly";
  currentOverride?: string | null;
}) {
  const [state, formAction, pending] = useActionState<
    { error?: string; success?: string } | undefined,
    FormData
  >(setSubscriptionAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}
      <input type="hidden" name="businessId" value={businessId} />

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Πακέτο" htmlFor="planId">
          <Select
            id="planId"
            name="planId"
            defaultValue={currentPlanId ?? plans[0]?.id ?? ""}
            required
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Κύκλος" htmlFor="billingCycle">
          <Select
            id="billingCycle"
            name="billingCycle"
            defaultValue={currentCycle ?? "monthly"}
          >
            <option value="monthly">Μηνιαία</option>
            <option value="yearly">Ετήσια</option>
          </Select>
        </Field>
        <Field
          label="Ειδική τιμή (€)"
          htmlFor="priceOverride"
          hint="Άφησέ το κενό για την τιμή του πακέτου"
        >
          <Input
            id="priceOverride"
            name="priceOverride"
            type="number"
            step="0.01"
            min="0"
            defaultValue={currentOverride ?? ""}
          />
        </Field>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} icon={Save}>
          {pending ? "Αποθήκευση..." : "Αποθήκευση συνδρομής"}
        </Button>
      </div>
    </form>
  );
}

export function RecordProviderCostForm({ businessId }: { businessId: string }) {
  const [state, formAction, pending] = useActionState<
    { error?: string; success?: string } | undefined,
    FormData
  >(recordProviderCostAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}
      <input type="hidden" name="businessId" value={businessId} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Έναρξη περιόδου" htmlFor="periodStart">
          <Input id="periodStart" name="periodStart" type="date" required />
        </Field>
        <Field label="Λήξη περιόδου" htmlFor="periodEnd">
          <Input id="periodEnd" name="periodEnd" type="date" required />
        </Field>
        <Field label="Καθαρό (€)" htmlFor="netAmount">
          <Input
            id="netAmount"
            name="netAmount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue="28.23"
          />
        </Field>
        <Field label="ΦΠΑ (€)" htmlFor="vatAmount">
          <Input
            id="vatAmount"
            name="vatAmount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue="6.77"
          />
        </Field>
      </div>
      <Field label="Περιγραφή" htmlFor="description">
        <Input
          id="description"
          name="description"
          defaultValue="Χρέωση Wrapp (per user)"
          maxLength={255}
        />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending} icon={Save}>
          {pending ? "Καταχώρηση..." : "Καταχώρηση κόστους"}
        </Button>
      </div>
    </form>
  );
}

export function PlatformInvoiceForm({
  businessId,
  subscriptionId,
}: {
  businessId: string;
  subscriptionId?: string | null;
}) {
  const [state, formAction, pending] = useActionState<
    { error?: string } | undefined,
    FormData
  >(createPlatformInvoiceAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      <input type="hidden" name="businessId" value={businessId} />
      {subscriptionId && (
        <input type="hidden" name="subscriptionId" value={subscriptionId} />
      )}

      <Field label="Περιγραφή" htmlFor="description">
        <Input
          id="description"
          name="description"
          required
          maxLength={255}
          defaultValue="Ετήσια συνδρομή Business — timologion"
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Καθαρό ποσό (€)" htmlFor="netAmount">
          <Input
            id="netAmount"
            name="netAmount"
            type="number"
            step="0.01"
            min="0"
            required
          />
        </Field>
        <Field label="ΦΠΑ (€)" htmlFor="vatAmount">
          <Input
            id="vatAmount"
            name="vatAmount"
            type="number"
            step="0.01"
            min="0"
            required
          />
        </Field>
        <Field
          label="Κόστος παρόχου (€)"
          htmlFor="providerCost"
          hint="Τι μας χρεώνει η Wrapp για αυτόν τον πελάτη."
        >
          <Input
            id="providerCost"
            name="providerCost"
            type="number"
            step="0.01"
            min="0"
            defaultValue="35"
          />
        </Field>
        <Field
          label="Επιστροφή παρόχου (€)"
          htmlFor="providerRebate"
          hint="Επιστρέφει η Wrapp μέρος για ενέργειες προώθησης κ.λπ."
        >
          <Input
            id="providerRebate"
            name="providerRebate"
            type="number"
            step="0.01"
            min="0"
            defaultValue="0"
          />
        </Field>
        <Field label="Περίοδος από" htmlFor="periodStart">
          <Input id="periodStart" name="periodStart" type="date" />
        </Field>
        <Field label="Περίοδος έως" htmlFor="periodEnd">
          <Input id="periodEnd" name="periodEnd" type="date" />
        </Field>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} icon={Save}>
          {pending ? "Αποθήκευση..." : "Δημιουργία πρόχειρου"}
        </Button>
      </div>
    </form>
  );
}
