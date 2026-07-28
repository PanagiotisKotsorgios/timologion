"use client";

import { useEffect, useState } from "react";
import { Plus, X, Wallet } from "lucide-react";
import { PaymentForm } from "./PaymentForm";

/**
 * Opens the payment form pre-filled for a specific open document — the
 * amount defaults to the document's outstanding balance, the docId /
 * clientId are hidden inputs so the server links the payment to the
 * parent invoice and recomputes paymentStatus automatically.
 *
 * Used in the "Ανεξόφλητα παραστατικά" table on /app/payments so users
 * can settle any open invoice inline without hopping over to the doc
 * detail page.
 */
export function RecordPaymentForDocButton({
  documentId,
  clientId,
  outstanding,
  clientLabel,
  docLabel,
  compact,
}: {
  documentId: string;
  clientId: string | null;
  outstanding: number;
  clientLabel: string;
  docLabel: string;
  compact?: boolean;
}) {
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
        className={
          compact
            ? "inline-flex items-center gap-1 rounded-full border-2 border-ink-900 bg-white px-2.5 py-0.5 text-xs font-bold text-ink-900 transition-colors hover:bg-ink-900 hover:text-white"
            : "inline-flex items-center gap-1.5 rounded-full border-2 border-ink-900 bg-white px-3 py-1.5 text-sm font-bold text-ink-900 transition-colors hover:bg-ink-900 hover:text-white"
        }
      >
        <Plus size={compact ? 12 : 14} strokeWidth={2.5} aria-hidden />
        Καταχώρηση
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`pay-doc-${documentId}-title`}
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
                    id={`pay-doc-${documentId}-title`}
                    className="text-2xl font-extrabold text-brand-900 md:text-3xl"
                  >
                    Καταχώρηση είσπραξης
                  </h2>
                  <p className="mt-1 text-sm text-ink-700">
                    {docLabel} · {clientLabel}
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
              <PaymentForm
                documentId={documentId}
                clientId={clientId ?? undefined}
                defaultAmount={outstanding}
                onSaved={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
