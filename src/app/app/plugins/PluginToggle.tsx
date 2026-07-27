"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Power, PowerOff, ArrowRight } from "lucide-react";
import { deactivatePluginAction } from "./actions";

/**
 * Toggle switch that shows current ON/OFF state and lets the user turn
 * the plugin off. Turning it back on goes through the confirmation
 * modal (`ActivatePluginButton`), so this component only needs to
 * handle the "deactivate" side.
 */
export function PluginToggle({
  code,
  pluginName,
  isOn,
}: {
  code: string;
  pluginName: string;
  isOn: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTx] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!confirming) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) setConfirming(false);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [confirming, pending]);

  function confirmOff() {
    const fd = new FormData();
    fd.set("code", code);
    startTx(async () => {
      await deactivatePluginAction(fd);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={
          isOn ? `Απενεργοποίηση ${pluginName}` : `Ενεργοποίηση ${pluginName}`
        }
        onClick={() => isOn && setConfirming(true)}
        disabled={!isOn}
        className={
          "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-800 focus:ring-offset-2 disabled:cursor-default " +
          (isOn ? "bg-emerald-600" : "bg-ink-300")
        }
      >
        <span
          className={
            "inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow transition-transform " +
            (isOn ? "translate-x-6" : "translate-x-1")
          }
        >
          {isOn ? (
            <Power size={10} className="text-emerald-700" aria-hidden />
          ) : (
            <PowerOff size={10} className="text-ink-500" aria-hidden />
          )}
        </span>
      </button>

      {confirming && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="deactivate-plugin-title"
          className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto p-4 py-10 sm:p-8"
        >
          <button
            type="button"
            aria-label="Κλείσιμο"
            onClick={() => !pending && setConfirming(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-ink-300/70 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-ink-300/60 px-8 py-6">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-100 text-red-700">
                  <PowerOff size={22} aria-hidden />
                </div>
                <div>
                  <h2
                    id="deactivate-plugin-title"
                    className="text-2xl font-extrabold text-brand-900 md:text-3xl"
                  >
                    Απενεργοποίηση: {pluginName}
                  </h2>
                  <p className="mt-1 text-sm text-ink-700">
                    Θα εξαφανιστεί από το πλαϊνό μενού.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Κλείσιμο"
                onClick={() => !pending && setConfirming(false)}
                disabled={pending}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-8 py-6">
              <p className="text-sm text-ink-800">
                Τα δεδομένα του πρόσθετου παραμένουν στη βάση — αν το
                ενεργοποιήσεις ξανά, θα τα δεις πάλι. Μπορείς να
                ξεκινήσεις νέα δωρεάν χρήση οποιαδήποτε στιγμή.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={pending}
                  className="inline-flex h-11 items-center rounded-full border-2 border-ink-300 bg-white px-5 text-sm font-bold text-ink-900 hover:border-brand-900 disabled:opacity-50"
                >
                  Άκυρο
                </button>
                <button
                  type="button"
                  onClick={confirmOff}
                  disabled={pending}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-red-700 px-5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 hover:bg-red-800 disabled:opacity-60"
                >
                  {pending ? "Απενεργοποίηση..." : "Απενεργοποίηση"}
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
