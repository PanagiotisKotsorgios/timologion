"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, X, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { attemptIssueAction } from "../actions";

/**
 * Issue-to-myDATA button with a lightweight payment-method
 * confirmation step. Every real issuance opens a small popup that
 * shows the payment method that will be recorded — the vast majority
 * of user complaints about "wrong method on my invoice" trace back to
 * an editor left on the default "Μετρητά" that never got changed.
 * A single click of "Επιβεβαίωση" fires the actual transmission.
 */
export function IssueButton({
  documentId,
  paymentMethod,
}: {
  documentId: string;
  /** Human-readable payment method label already stored on the doc,
   *  e.g. "Μετρητά" / "Κάρτα" / "Τραπεζική μεταφορά". */
  paymentMethod?: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  function confirm() {
    setOpen(false);
    start(async () => {
      const res = await attemptIssueAction(documentId);
      if (res.ok) {
        toast.success("Το παραστατικό διαβιβάστηκε στο myDATA.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={pending} icon={Send}>
        {pending ? "Διαβίβαση..." : "Διαβίβαση στο myDATA"}
      </Button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="issue-confirm-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border-2 border-ink-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b-2 border-ink-100 px-5 py-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-brand-900/60">
                  Επιβεβαίωση διαβίβασης
                </p>
                <h2
                  id="issue-confirm-title"
                  className="mt-0.5 text-lg font-extrabold text-brand-900"
                >
                  Έλεγξε τον τρόπο πληρωμής
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Κλείσιμο"
                className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm text-ink-700">
                Το παραστατικό θα διαβιβαστεί στο myDATA με τον
                παρακάτω τρόπο πληρωμής:
              </p>
              <div className="mt-3 flex items-center gap-3 rounded-xl border-2 border-brand-100 bg-brand-50/60 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-900 text-white">
                  <CreditCard size={18} strokeWidth={2.5} aria-hidden />
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-900/60">
                    Τρόπος πληρωμής
                  </p>
                  <p className="mt-0.5 text-base font-extrabold text-brand-900">
                    {paymentMethod?.trim() || "Δεν έχει οριστεί"}
                  </p>
                </div>
              </div>
              {!paymentMethod?.trim() && (
                <p className="mt-3 text-xs font-semibold text-amber-800">
                  Δεν έχεις επιλέξει τρόπο πληρωμής — αν χρειάζεται, γύρνα
                  πίσω και συμπλήρωσέ τον στο πρόχειρο.
                </p>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t-2 border-ink-100 bg-ink-50 p-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 items-center rounded-lg border-2 border-ink-300 bg-white px-4 text-sm font-bold text-ink-800 hover:bg-ink-100"
              >
                Ακύρωση
              </button>
              <button
                type="button"
                onClick={confirm}
                className="inline-flex h-10 items-center gap-2 rounded-lg border-2 border-brand-800 bg-brand-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-brand-800"
              >
                <Send size={14} strokeWidth={2.5} aria-hidden />
                Επιβεβαίωση & Διαβίβαση
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
