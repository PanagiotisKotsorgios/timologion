"use client";

import { useEffect, useState } from "react";
import { Plus, X, Wallet } from "lucide-react";
import { PaymentForm } from "./PaymentForm";

/**
 * Opens the "Νέα είσπραξη" form inside a proper modal instead of taking up
 * a whole card on the payments page. Cleaner default layout, no distraction
 * from the actual receipts history.
 */
export function NewPaymentButton() {
  const [open, setOpen] = useState(false);

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-lg border-2 border-emerald-700 bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 sm:h-11 sm:text-base"
      >
        <Plus size={16} strokeWidth={2.5} aria-hidden />
        Νέα είσπραξη
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-payment-title"
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 py-10 sm:p-8"
        >
          <button
            type="button"
            aria-label="Κλείσιμο"
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-ink-300/70 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-ink-300/60 px-8 py-6">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-800">
                  <Wallet size={22} aria-hidden />
                </div>
                <div>
                  <h2
                    id="new-payment-title"
                    className="text-2xl font-extrabold text-brand-900 md:text-3xl"
                  >
                    Νέα είσπραξη
                  </h2>
                  <p className="mt-1 text-sm text-ink-700">
                    Καταχώρησε είσπραξη χωρίς σύνδεση με παραστατικό.
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
              <PaymentForm onSaved={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
