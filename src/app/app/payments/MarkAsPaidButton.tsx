"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, X } from "lucide-react";
import { markDocumentPaidAction } from "./actions";

/**
 * "Σήμανση ως εξοφλημένο" quick action for the outstanding-invoices
 * table. Renders a bright green button and opens a small confirmation
 * popup before submitting — one accidental tap won't record a full
 * payment against the wrong invoice.
 */
export function MarkAsPaidButton({
  documentId,
  docLabel,
  clientLabel,
  outstanding,
  money,
}: {
  documentId: string;
  docLabel: string;
  clientLabel: string;
  outstanding: number;
  money: (n: number) => string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTx] = useTransition();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending]);

  function confirm() {
    const fd = new FormData();
    fd.set("documentId", documentId);
    startTx(async () => {
      await markDocumentPaidAction(fd);
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Σήμανση ως εξοφλημένο"
        className="inline-flex items-center gap-1.5 rounded-full border-2 border-emerald-600 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-sm transition-colors hover:bg-emerald-600 hover:text-white sm:text-sm"
      >
        <CheckCircle2 size={14} strokeWidth={2.5} aria-hidden />
        <span>Εξόφληση</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`mark-paid-${documentId}-title`}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 sm:p-6"
        >
          <button
            type="button"
            aria-label="Κλείσιμο"
            onClick={() => !pending && setOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-emerald-300 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-ink-300/60 bg-emerald-50 px-6 py-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm">
                  <CheckCircle2 size={22} strokeWidth={2.5} aria-hidden />
                </div>
                <div>
                  <h2
                    id={`mark-paid-${documentId}-title`}
                    className="text-lg font-extrabold text-emerald-900"
                  >
                    Σήμανση ως εξοφλημένο;
                  </h2>
                  <p className="mt-0.5 text-sm text-emerald-800">
                    Το παραστατικό {docLabel} — {clientLabel} θα σημανθεί
                    ως πλήρως εξοφλημένο.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Κλείσιμο"
                onClick={() => !pending && setOpen(false)}
                disabled={pending}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900 disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
                <p>
                  Θα καταγραφεί αυτόματα είσπραξη{" "}
                  <strong>{money(outstanding)}</strong> με σημερινή
                  ημερομηνία και μέθοδο <strong>«Μετρητά»</strong>. Αν
                  χρειάζεσαι διαφορετική μέθοδο ή ημερομηνία, χρησιμοποίησε
                  το «Καταχώρηση».
                </p>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="inline-flex h-11 items-center justify-center rounded-lg border-2 border-ink-300 bg-white px-5 text-sm font-bold text-ink-900 hover:bg-ink-100 disabled:opacity-50"
                >
                  Άκυρο
                </button>
                <button
                  type="button"
                  onClick={confirm}
                  disabled={pending}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border-2 border-emerald-700 bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                >
                  <CheckCircle2 size={16} strokeWidth={2.5} aria-hidden />
                  {pending ? "Καταχώρηση..." : "Ναι, εξοφλήθηκε"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
