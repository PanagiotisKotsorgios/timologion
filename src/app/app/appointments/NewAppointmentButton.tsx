"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  AppointmentForm,
  type AppointmentInitial,
} from "./AppointmentForm";

type StaffOpt = { id: string; fullName: string };
type ClientOpt = { id: string; label: string };
type ItemOpt = {
  id: string;
  name: string;
  unit: string;
  defaultPrice: string;
  vatRate: string;
};

export function NewAppointmentButton({
  staff,
  clients,
  items,
  mode = "create",
  initial,
  label,
  small,
}: {
  staff: StaffOpt[];
  clients: ClientOpt[];
  items: ItemOpt[];
  mode?: "create" | "edit";
  initial?: AppointmentInitial;
  label?: string;
  small?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const buttonLabel = label ?? (mode === "edit" ? "Επεξεργασία" : "Νέο ραντεβού");

  return (
    <>
      {small ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold text-brand-800 hover:bg-brand-50"
        >
          {buttonLabel}
        </button>
      ) : (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          icon={Plus}
          size="md"
        >
          {buttonLabel}
        </Button>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-appointment-title"
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 py-10 sm:p-8"
        >
          <button
            type="button"
            aria-label="Κλείσιμο"
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-ink-300/70 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-ink-300/60 px-8 py-6">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-800">
                  <CalendarDays size={22} aria-hidden />
                </div>
                <div>
                  <h2
                    id="new-appointment-title"
                    className="text-2xl font-extrabold text-brand-900 md:text-3xl"
                  >
                    {mode === "edit" ? "Επεξεργασία ραντεβού" : "Νέο ραντεβού"}
                  </h2>
                  <p className="mt-1 text-sm text-ink-700">
                    {mode === "edit"
                      ? "Ενημέρωσε τα στοιχεία της κράτησης."
                      : "Κράτηση χρόνου με πελάτη — σύνδεση με υπηρεσία από τον κατάλογο."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Κλείσιμο"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-8 py-6">
              <AppointmentForm
                mode={mode}
                initial={initial}
                staff={staff}
                clients={clients}
                items={items}
                onSaved={() => {
                  setOpen(false);
                  router.refresh();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
