"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, X, Gift, ShieldCheck } from "lucide-react";
import { activatePluginAction } from "./actions";

/**
 * Renders the "Ενεργοποίηση" CTA + a confirmation modal that discloses
 * the 1-year free window and the post-trial monthly price BEFORE the
 * user commits. No pricing appears on the card itself — the disclosure
 * lives in the popup so the entry point stays "Δωρεάν".
 */
export function ActivatePluginButton({
  code,
  pluginName,
  priceMonthly,
  variant = "primary",
  label,
}: {
  code: string;
  pluginName: string;
  priceMonthly: number;
  variant?: "primary" | "danger";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
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

  function confirm() {
    const fd = new FormData();
    fd.set("code", code);
    startTx(async () => {
      await activatePluginAction(fd);
      // activatePluginAction redirects; if it returns instead (idempotent
      // no-op), refresh the shell so the sidebar picks up the new plugin.
      router.refresh();
    });
  }

  const priceLabel =
    priceMonthly > 0
      ? `${priceMonthly.toFixed(2).replace(".", ",")}€ / μήνα`
      : "δωρεάν και μετά τη λήξη";

  const ctaClass =
    variant === "danger"
      ? "bg-red-700 hover:bg-red-800"
      : "bg-brand-900 hover:bg-black";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          "inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 " +
          ctaClass
        }
      >
        {label ?? "Ενεργοποίηση"}
        <ArrowRight size={14} aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="activate-plugin-title"
          className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto p-4 py-10 sm:p-8"
        >
          <button
            type="button"
            aria-label="Κλείσιμο"
            onClick={() => !pending && setOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-ink-300/70 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-ink-300/60 px-8 py-6">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-800">
                  <Gift size={22} aria-hidden />
                </div>
                <div>
                  <h2
                    id="activate-plugin-title"
                    className="text-2xl font-extrabold text-brand-900 md:text-3xl"
                  >
                    Ενεργοποίηση: {pluginName}
                  </h2>
                  <p className="mt-1 text-sm text-ink-700">
                    Δωρεάν για ένα ολόκληρο έτος από σήμερα.
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
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-widest text-emerald-900/70">
                  Τι θα ισχύσει
                </p>
                <ul className="mt-3 space-y-2 text-sm text-emerald-900">
                  <li className="flex items-start gap-2">
                    <ShieldCheck
                      size={16}
                      strokeWidth={2.5}
                      className="mt-0.5 shrink-0"
                      aria-hidden
                    />
                    <span>
                      <strong>0€</strong> για τους πρώτους{" "}
                      <strong>12 μήνες</strong> από την ενεργοποίηση.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck
                      size={16}
                      strokeWidth={2.5}
                      className="mt-0.5 shrink-0"
                      aria-hidden
                    />
                    <span>
                      Μετά τη λήξη, χρέωση{" "}
                      <strong>{priceLabel}</strong>. Θα σε ρωτήσουμε ξανά
                      πριν χρεώσουμε — δεν γίνεται αυτόματη ανανέωση.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck
                      size={16}
                      strokeWidth={2.5}
                      className="mt-0.5 shrink-0"
                      aria-hidden
                    />
                    <span>
                      Μπορείς να ακυρώσεις οποιαδήποτε στιγμή κατά τη
                      διάρκεια του δωρεάν έτους χωρίς χρέωση.
                    </span>
                  </li>
                </ul>
              </div>

              <p className="text-xs text-ink-500">
                Πατώντας «Ενεργοποίηση» ξεκινά η δωρεάν χρήση σου.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="inline-flex h-11 items-center rounded-full border-2 border-ink-300 bg-white px-5 text-sm font-bold text-ink-900 hover:border-brand-900 disabled:opacity-50"
                >
                  Άκυρο
                </button>
                <button
                  type="button"
                  onClick={confirm}
                  disabled={pending}
                  className={
                    "inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60 " +
                    ctaClass
                  }
                >
                  {pending ? "Ενεργοποίηση..." : "Ενεργοποίηση"}
                  {!pending && <ArrowRight size={14} aria-hidden />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
