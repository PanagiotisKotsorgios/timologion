"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, X, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { quickCreateItemAction } from "@/app/app/items/actions";

export type CreatedItemPayload = {
  id: string;
  name: string;
  unit: string;
  defaultPrice: string;
  vatRate: string;
};

type QuickAddItemButtonProps = {
  onCreated: (item: CreatedItemPayload) => void;
  label?: string;
  compact?: boolean;
  /**
   * Optional controlled-open mode. When `openState` is provided the
   * parent owns the modal's open state; the visible button becomes a
   * secondary trigger. Used when a select-option sentinel elsewhere
   * in the parent also needs to fire the same modal.
   */
  openState?: [boolean, (open: boolean) => void];
  /** Hide the trigger button entirely; only the modal renders. */
  hideTrigger?: boolean;
};

/**
 * "Νέο είδος" shortcut for the line editor inside the DraftEditor.
 * Opens a minimal item form, calls the quick-create action, then
 * hands back the row so the caller can immediately plug it into the
 * line that triggered the modal.
 */
export function QuickAddItemButton({
  onCreated,
  label = "Νέο είδος",
  compact,
  openState,
  hideTrigger,
}: QuickAddItemButtonProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openState ? openState[0] : uncontrolledOpen;
  const setOpen = openState ? openState[1] : setUncontrolledOpen;
  const [pending, startTx] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState({
    kind: "service" as "service" | "product",
    name: "",
    code: "",
    unit: "τμχ",
    defaultPrice: "0",
    vatRate: "24",
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
    if (!values.name.trim()) {
      setError("Η ονομασία είναι υποχρεωτική.");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("kind", values.kind);
    fd.set("name", values.name);
    fd.set("code", values.code);
    fd.set("unit", values.unit);
    fd.set("defaultPrice", values.defaultPrice);
    fd.set("vatRate", values.vatRate);
    startTx(async () => {
      const res = await quickCreateItemAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onCreated({
        id: res.id,
        name: res.name,
        unit: res.unit,
        defaultPrice: res.defaultPrice,
        vatRate: res.vatRate,
      });
      setOpen(false);
      setValues({
        kind: "service",
        name: "",
        code: "",
        unit: "τμχ",
        defaultPrice: "0",
        vatRate: "24",
      });
    });
  }

  return (
    <>
      {!hideTrigger && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={
            compact
              ? "inline-flex items-center gap-1 rounded-md border-2 border-ink-900 bg-white px-2 py-0.5 text-xs font-bold text-ink-900 transition-colors hover:bg-ink-900 hover:text-white"
              : "inline-flex items-center gap-1.5 rounded-full border-2 border-ink-900 bg-white px-3 py-1.5 text-sm font-bold text-ink-900 transition-colors hover:bg-ink-900 hover:text-white"
          }
        >
          <Plus size={compact ? 12 : 14} strokeWidth={2.5} aria-hidden />
          {label}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-add-item-title"
          className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto p-4 py-10 sm:p-8"
        >
          <button
            type="button"
            aria-label="Κλείσιμο"
            onClick={() => !pending && setOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-ink-300/70 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-ink-300/60 px-8 py-6">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-800">
                  <PackagePlus size={22} aria-hidden />
                </div>
                <div>
                  <h2
                    id="quick-add-item-title"
                    className="text-2xl font-extrabold text-brand-900 md:text-3xl"
                  >
                    Νέο είδος
                  </h2>
                  <p className="mt-1 text-sm text-ink-700">
                    Γρήγορη προσθήκη — αποθηκεύεται στον κατάλογο και
                    προεπιλέγεται στη γραμμή σου.
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

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Τύπος" htmlFor="qa-kind">
                  <Select
                    id="qa-kind"
                    value={values.kind}
                    onChange={(e) =>
                      set("kind", e.target.value as "service" | "product")
                    }
                  >
                    <option value="service">Υπηρεσία</option>
                    <option value="product">Προϊόν</option>
                  </Select>
                </Field>
                <Field label="Κωδικός (προαιρετικός)" htmlFor="qa-code">
                  <Input
                    id="qa-code"
                    value={values.code}
                    onChange={(e) => set("code", e.target.value)}
                    maxLength={60}
                  />
                </Field>

                <Field
                  label="Ονομασία"
                  htmlFor="qa-name"
                  className="md:col-span-2"
                  required
                >
                  <Input
                    id="qa-name"
                    value={values.name}
                    onChange={(e) => set("name", e.target.value)}
                    autoFocus
                    required
                    maxLength={160}
                  />
                </Field>

                <Field label="Μονάδα μέτρησης" htmlFor="qa-unit">
                  <Input
                    id="qa-unit"
                    value={values.unit}
                    onChange={(e) => set("unit", e.target.value)}
                    maxLength={20}
                  />
                </Field>
                <Field label="Προεπιλεγμένη τιμή (€)" htmlFor="qa-price">
                  <Input
                    id="qa-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={values.defaultPrice}
                    onChange={(e) => set("defaultPrice", e.target.value)}
                  />
                </Field>

                <Field label="ΦΠΑ %" htmlFor="qa-vat">
                  <Select
                    id="qa-vat"
                    value={values.vatRate}
                    onChange={(e) => set("vatRate", e.target.value)}
                  >
                    <option value="0">0%</option>
                    <option value="6">6%</option>
                    <option value="13">13%</option>
                    <option value="24">24%</option>
                  </Select>
                </Field>
              </div>

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
                  disabled={pending || !values.name.trim()}
                >
                  {pending ? "Προσθήκη..." : "Προσθήκη είδους"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
