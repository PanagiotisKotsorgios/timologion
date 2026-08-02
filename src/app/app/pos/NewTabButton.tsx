"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, ShoppingCart } from "lucide-react";
import { openTabAction } from "./actions";

/**
 * Primary "Νέος λογαριασμός" CTA in the POS header. Colored emerald
 * (matches other add-actions in the app). Opens a compact modal for a
 * quick-name step; the modal supports Enter-to-submit and Esc-to-close.
 */
export function NewTabButton() {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [pending, startTx] = useTransition();
  const router = useRouter();

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

  function submit() {
    const fd = new FormData();
    fd.set("label", label);
    startTx(async () => {
      const res = await openTabAction(fd);
      if (res.ok) router.push(`/app/pos/${res.id}`);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-lg border-2 border-emerald-700 bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 sm:h-11 sm:text-base"
      >
        <Plus size={16} strokeWidth={2.5} aria-hidden />
        Νέος λογαριασμός
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-tab-title"
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 py-10 sm:p-8"
        >
          <button
            type="button"
            aria-label="Κλείσιμο"
            onClick={() => !pending && setOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-ink-300/70 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-ink-300/60 bg-emerald-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm">
                  <ShoppingCart size={22} strokeWidth={2.5} aria-hidden />
                </div>
                <div>
                  <h2
                    id="new-tab-title"
                    className="text-lg font-extrabold text-emerald-900 sm:text-xl"
                  >
                    Νέος λογαριασμός πάγκου
                  </h2>
                  <p className="mt-0.5 text-xs text-emerald-800">
                    Χωρίς τραπέζι — για γρήγορη πώληση.
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

            <div className="space-y-4 p-5">
              <div>
                <label
                  htmlFor="tab-label"
                  className="block text-sm font-bold text-ink-900"
                >
                  Ετικέτα{" "}
                  <span className="text-xs font-normal text-ink-500">
                    (προαιρετικό)
                  </span>
                </label>
                <input
                  id="tab-label"
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  maxLength={80}
                  placeholder="π.χ. Ταμείο 1, Delivery, Take-away"
                  autoFocus
                  className="mt-2 h-12 w-full rounded-lg border-2 border-ink-300 bg-white px-4 text-base text-ink-900 placeholder:text-ink-500 focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
                />
                <p className="mt-1.5 text-xs text-ink-500">
                  Βοηθάει να ξεχωρίζεις τους λογαριασμούς σου. Αν το αφήσεις
                  κενό, ονομάζεται αυτόματα.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="inline-flex h-11 items-center justify-center rounded-lg border-2 border-ink-300 bg-white px-5 text-sm font-bold text-ink-900 hover:bg-ink-100 disabled:opacity-50"
                >
                  Ακύρωση
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={pending}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border-2 border-emerald-700 bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus size={16} strokeWidth={2.5} aria-hidden />
                  {pending ? "Άνοιγμα..." : "Άνοιγμα λογαριασμού"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
