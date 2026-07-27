"use client";

import { useActionState, useMemo, useState } from "react";
import { Save, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { money } from "@/lib/format";
import {
  saveAppointmentAction,
  type AppointmentFormState,
} from "./actions";

type StaffOpt = { id: string; fullName: string };
type ClientOpt = { id: string; label: string };
type ItemOpt = {
  id: string;
  name: string;
  unit: string;
  defaultPrice: string;
  vatRate: string;
};

export type AppointmentInitial = {
  id?: string;
  staffUserId?: string | null;
  clientId?: string | null;
  itemId?: string | null;
  serviceName?: string;
  startAt?: Date | string;
  endAt?: Date | string;
  priceOverride?: number | string | null;
  vatRate?: number | string | null;
  notes?: string | null;
};

function toLocalInput(v: Date | string | undefined): string {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v) : v;
  const pad = (n: number) => (n < 10 ? "0" + n : String(n));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultStart(): string {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  return toLocalInput(now);
}

function plusHour(iso: string): string {
  const d = new Date(iso);
  d.setHours(d.getHours() + 1);
  return toLocalInput(d);
}

export function AppointmentForm({
  mode,
  initial,
  staff,
  clients,
  items,
  onSaved,
}: {
  mode: "create" | "edit";
  initial?: AppointmentInitial;
  staff: StaffOpt[];
  clients: ClientOpt[];
  items: ItemOpt[];
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState<
    AppointmentFormState,
    FormData
  >(async (prev, fd) => {
    const res = await saveAppointmentAction(prev, fd);
    if (!res?.error && onSaved) onSaved();
    return res;
  }, undefined);

  const initialStart = toLocalInput(initial?.startAt) || defaultStart();
  const [values, setValues] = useState({
    id: initial?.id ?? "",
    staffUserId: initial?.staffUserId ?? "",
    clientId: initial?.clientId ?? "",
    itemId: initial?.itemId ?? "",
    serviceName: initial?.serviceName ?? "",
    startAt: initialStart,
    endAt: toLocalInput(initial?.endAt) || plusHour(initialStart),
    priceOverride:
      initial?.priceOverride != null ? String(initial.priceOverride) : "",
    vatRate: initial?.vatRate != null ? String(initial.vatRate) : "",
    notes: initial?.notes ?? "",
  });

  function set<K extends keyof typeof values>(
    key: K,
    v: (typeof values)[K],
  ) {
    setValues((s) => ({ ...s, [key]: v }));
  }

  function pickItem(itemId: string) {
    const found = items.find((i) => i.id === itemId);
    setValues((s) => ({
      ...s,
      itemId,
      serviceName: found?.name ?? s.serviceName,
      priceOverride: found?.defaultPrice ?? s.priceOverride,
      vatRate: found?.vatRate ?? s.vatRate,
    }));
  }

  const preview = useMemo(() => {
    const net = Number(values.priceOverride) || 0;
    const rate = Number(values.vatRate) || 0;
    const vat = Math.round(((net * rate) / 100) * 100) / 100;
    return { net, vat, total: Math.round((net + vat) * 100) / 100 };
  }, [values.priceOverride, values.vatRate]);

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <section className="grid gap-4 md:grid-cols-2">
        <Field label="Έναρξη" htmlFor="startAt" required>
          <Input
            id="startAt"
            name="startAt"
            type="datetime-local"
            required
            value={values.startAt}
            onChange={(e) => {
              set("startAt", e.target.value);
              // If the user hasn't picked an end, auto-shift +1h.
              if (!values.endAt || values.endAt <= e.target.value) {
                set("endAt", plusHour(e.target.value));
              }
            }}
          />
        </Field>
        <Field label="Λήξη" htmlFor="endAt" required>
          <Input
            id="endAt"
            name="endAt"
            type="datetime-local"
            required
            value={values.endAt}
            onChange={(e) => set("endAt", e.target.value)}
          />
        </Field>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Field label="Πελάτης" htmlFor="clientId">
          <Select
            id="clientId"
            name="clientId"
            value={values.clientId}
            onChange={(e) => set("clientId", e.target.value)}
          >
            <option value="">— Χωρίς πελάτη —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ανάθεση σε" htmlFor="staffUserId">
          <Select
            id="staffUserId"
            name="staffUserId"
            value={values.staffUserId}
            onChange={(e) => set("staffUserId", e.target.value)}
          >
            <option value="">— Χωρίς ανάθεση —</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </Select>
        </Field>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Field label="Υπηρεσία από κατάλογο" htmlFor="itemId">
          <Select
            id="itemId"
            name="itemId"
            value={values.itemId}
            onChange={(e) => pickItem(e.target.value)}
          >
            <option value="">— Ελεύθερη περιγραφή —</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Τίτλος ραντεβού" htmlFor="serviceName" required>
          <Input
            id="serviceName"
            name="serviceName"
            required
            value={values.serviceName}
            onChange={(e) => set("serviceName", e.target.value)}
            maxLength={200}
            placeholder="π.χ. Συμβουλευτική, Κοπή μαλλιών"
          />
        </Field>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Field label="Τιμή (€)" htmlFor="priceOverride">
          <Input
            id="priceOverride"
            name="priceOverride"
            type="number"
            step="0.01"
            min="0"
            value={values.priceOverride}
            onChange={(e) => set("priceOverride", e.target.value)}
            placeholder="0.00"
          />
        </Field>
        <Field label="ΦΠΑ %" htmlFor="vatRate">
          <Select
            id="vatRate"
            name="vatRate"
            value={values.vatRate}
            onChange={(e) => set("vatRate", e.target.value)}
          >
            <option value="">—</option>
            <option value="0">0%</option>
            <option value="6">6%</option>
            <option value="13">13%</option>
            <option value="24">24%</option>
          </Select>
        </Field>
        <div className="rounded-2xl border-2 border-brand-100 bg-brand-50/50 p-4">
          <div className="flex justify-between text-sm text-ink-700">
            <span>Καθαρό</span>
            <span className="font-semibold">{money(preview.net)}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm text-ink-700">
            <span>ΦΠΑ</span>
            <span className="font-semibold">{money(preview.vat)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t-2 border-brand-200 pt-2">
            <span className="font-bold text-brand-900">Σύνολο</span>
            <span className="text-lg font-extrabold text-brand-900">
              {money(preview.total)}
            </span>
          </div>
        </div>
      </section>

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
