"use client";

import { useEffect, useTransition } from "react";
import { devSimulateActivationAction } from "./activation-actions";

// Replace with the real Wrapp partner onboarding URL when the integration
// lands. Meanwhile, this opens Wrapp's public partner information page.
const PROVIDER_URL = "https://wrapp.ai/el/api/becomeapartner";

export function ActivationGate({ devMode }: { devMode: boolean }) {
  const [simulating, startSimulate] = useTransition();

  // Lock body scroll while the gate is open.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="activation-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-900/85 backdrop-blur-sm p-4 md:p-8"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border-2 border-white/10 bg-white shadow-2xl">
        {/* Warning band */}
        <div className="flex items-start gap-4 bg-amber-50 border-b-2 border-amber-300 px-8 py-5">
          <span
            aria-hidden
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-400 text-white"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 9v4M12 17h.01M4.93 19h14.14a2 2 0 0 0 1.75-2.98l-7.07-12.72a2 2 0 0 0-3.5 0L3.18 16.02A2 2 0 0 0 4.93 19Z" />
            </svg>
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-800">
              Απαιτείται ενέργεια
            </p>
            <p className="mt-1 text-base font-semibold text-amber-900">
              Η υπηρεσία έκδοσης δεν είναι ενεργοποιημένη
            </p>
          </div>
        </div>

        <div className="px-8 py-10 md:px-12 md:py-12">
          <h2
            id="activation-title"
            className="text-3xl font-bold tracking-tight text-ink-900 md:text-4xl"
          >
            Ολοκλήρωσε την ενεργοποίηση για να συνεχίσεις
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-700">
            Για να μπορέσεις να εκδώσεις παραστατικά, πρέπει πρώτα να
            ολοκληρώσεις την ενεργοποίηση της υπηρεσίας ηλεκτρονικής έκδοσης
            μέσω του συνεργαζόμενου παρόχου. Η διαδικασία γίνεται μία φορά και
            διαρκεί μερικά λεπτά.
          </p>

          <ol className="mt-8 space-y-3 rounded-2xl border-2 border-ink-300 bg-ink-100 p-5 text-base text-ink-900">
            <Step n="1" text="Μετάβαση στον πάροχο με το κουμπί παρακάτω." />
            <Step
              n="2"
              text="Υπογραφή σύμβασης και εξόφληση της συνδρομής του παρόχου."
            />
            <Step
              n="3"
              text="Επιστροφή στο timologion — η υπηρεσία ενεργοποιείται αυτόματα."
            />
          </ol>

          <div className="mt-10">
            <a
              href={PROVIDER_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-brand-700 px-6 text-lg font-semibold text-white transition-colors hover:bg-brand-800"
            >
              Ενεργοποίηση τώρα
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M7 17 17 7M8 7h9v9" />
              </svg>
            </a>
          </div>

          {devMode && (
            <div className="mt-8 border-t-2 border-ink-300 pt-6">
              <button
                type="button"
                disabled={simulating}
                onClick={() =>
                  startSimulate(async () => {
                    await devSimulateActivationAction();
                  })
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border-2 border-ink-500 bg-ink-100 px-5 text-sm font-semibold text-ink-900 transition-colors hover:bg-ink-300/50 disabled:opacity-50"
              >
                {simulating ? "Ενεργοποίηση..." : "Προσομοίωση Χωρίς Πάροχο"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ n, text }: { n: string; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-700 text-sm font-bold text-white"
      >
        {n}
      </span>
      <span className="leading-relaxed">{text}</span>
    </li>
  );
}
