"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  devSimulateActivationAction,
  startWrappActivationAction,
  checkActivationAction,
  setWrappApiKeyManuallyAction,
} from "./activation-actions";

export function ActivationGate({
  devMode,
  hasPhone,
}: {
  devMode: boolean;
  hasPhone: boolean;
}) {
  const [simulating, startSimulate] = useTransition();
  const [starting, startStart] = useTransition();
  const [manualBusy, startManual] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [manualApiKey, setManualApiKey] = useState("");
  const [polling, setPolling] = useState(false);

  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // Auto-poll: if the user returned from Wrapp and the webhook fires within a
  // few seconds, we'll pick it up and close the gate without a click. Runs
  // every 4 seconds; stops after 60 seconds so we don't hammer the server
  // forever. The user can trigger a fresh poll cycle by pressing the button
  // (currently not exposed — this whole cycle is silent).
  useEffect(() => {
    setPolling(true);
    let ticks = 0;
    const maxTicks = 15; // ~60s
    const id = window.setInterval(async () => {
      ticks += 1;
      try {
        const res = await checkActivationAction();
        if (res.active) {
          window.clearInterval(id);
          window.location.reload();
          return;
        }
      } catch {
        // silent — never surface polling errors
      }
      if (ticks >= maxTicks) {
        window.clearInterval(id);
        setPolling(false);
      }
    }, 4000);
    pollRef.current = id;
    return () => {
      window.clearInterval(id);
    };
  }, []);

  function activate() {
    setError(null);
    if (!hasPhone && !phone.trim()) {
      setError("Συμπλήρωσε αριθμό τηλεφώνου για να συνεχίσεις.");
      return;
    }
    startStart(async () => {
      const res = await startWrappActivationAction(
        !hasPhone ? { phone: phone.trim() } : {},
      );
      if (res.ok) {
        window.location.href = res.loginUrl;
        return;
      }
      if (res.alreadyActive) {
        window.location.reload();
        return;
      }
      setError(res.error);
    });
  }

  function submitManual() {
    setError(null);
    if (!manualApiKey.trim() || !manualEmail.trim()) {
      setError("Συμπλήρωσε και τα δύο πεδία.");
      return;
    }
    const fd = new FormData();
    fd.set("apiKey", manualApiKey.trim());
    fd.set("email", manualEmail.trim());
    startManual(async () => {
      const res = await setWrappApiKeyManuallyAction(fd);
      if (res.ok) {
        window.location.reload();
        return;
      }
      setError(res.error);
    });
  }

  const busy = starting || manualBusy;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="activation-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-900/85 backdrop-blur-sm p-4 md:p-8"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border-2 border-white/10 bg-white shadow-2xl">
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
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-800">
              Απαιτείται ενέργεια
            </p>
            <p className="mt-1 text-base font-semibold text-amber-900">
              Η υπηρεσία έκδοσης δεν είναι ενεργοποιημένη
            </p>
          </div>
          {polling && (
            <span
              aria-live="polite"
              className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-200/70 px-2 py-1 text-[11px] font-bold text-amber-900"
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-800"
              />
              Έλεγχος...
            </span>
          )}
        </div>

        <div className="px-8 py-10 md:px-12 md:py-12">
          {!showManual ? (
            <>
              <h2
                id="activation-title"
                className="text-3xl font-bold tracking-tight text-ink-900 md:text-4xl"
              >
                Ολοκλήρωσε την ενεργοποίηση για να συνεχίσεις
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-ink-700">
                Πάτα «Ενεργοποίηση τώρα» για να μεταβείς με ασφάλεια στη Wrapp.
                Μόλις ολοκληρώσεις εκεί, η ενεργοποίηση εντοπίζεται{" "}
                <strong>αυτόματα</strong> στο dashboard σου.
              </p>

              <ol className="mt-8 space-y-3 rounded-2xl border-2 border-ink-300 bg-ink-100 p-5 text-base text-ink-900">
                <Step
                  n="1"
                  text="Θα ανοίξει το ασφαλές portal της Wrapp με τα στοιχεία σου προσυμπληρωμένα."
                />
                <Step
                  n="2"
                  text="Ολοκλήρωσε τη σύνδεση / ενεργοποίηση του λογαριασμού στη Wrapp."
                />
                <Step
                  n="3"
                  text="Επιστρέφεις εδώ — η ενεργοποίηση εντοπίζεται αυτόματα σε λίγα δευτερόλεπτα."
                />
              </ol>

              {!hasPhone && (
                <div className="mt-8 rounded-2xl border-2 border-brand-200 bg-brand-50 p-5">
                  <label
                    htmlFor="activation-phone"
                    className="block text-sm font-bold text-brand-900"
                  >
                    Τηλέφωνο επιχείρησης
                    <span className="ml-1 text-red-700">*</span>
                  </label>
                  <p className="mt-1 text-xs text-brand-900/70">
                    Η Wrapp το χρειάζεται για την ενεργοποίηση. Θα αποθηκευτεί
                    στα στοιχεία της επιχείρησής σου.
                  </p>
                  <input
                    id="activation-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={30}
                    required
                    placeholder="π.χ. 6912345678"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (error) setError(null);
                    }}
                    className="mt-3 h-12 w-full rounded-lg border-2 border-brand-300 bg-white px-4 text-base text-ink-900 focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
                  />
                </div>
              )}

              {error && (
                <div className="mt-6 rounded-lg border-2 border-red-300 bg-red-50 p-4 text-sm font-medium text-red-800">
                  {error}
                </div>
              )}

              <div className="mt-8 space-y-3">
                <button
                  type="button"
                  onClick={activate}
                  disabled={busy}
                  className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-brand-700 px-6 text-lg font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
                >
                  {starting ? "Άνοιγμα Wrapp..." : "Ενεργοποίηση τώρα"}
                  {!starting && (
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
                  )}
                </button>
              </div>

              <div className="mt-8 border-t-2 border-ink-200 pt-6">
                <p className="text-sm text-ink-700">
                  Ολοκλήρωσες ήδη την πληρωμή στη Wrapp αλλά δεν εντοπίστηκε
                  αυτόματα;
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setShowManual(true);
                  }}
                  className="mt-2 text-sm font-bold text-brand-800 underline underline-offset-4 hover:text-brand-900"
                >
                  Καταχώρησε το api_key χειροκίνητα →
                </button>
              </div>
            </>
          ) : (
            <>
              <h2
                id="activation-title"
                className="text-2xl font-bold tracking-tight text-ink-900 md:text-3xl"
              >
                Χειροκίνητη καταχώρηση κλειδιού Wrapp
              </h2>
              <p className="mt-4 text-base text-ink-700">
                Επικοινώνησε με τη Wrapp και ζήτησέ τους το{" "}
                <strong>tenant api_key</strong> του λογαριασμού σου (αυτό που
                στέλνεται συνήθως αυτόματα στο webhook). Επικόλλησέ το εδώ μαζί
                με το email του λογαριασμού Wrapp και είσαι έτοιμος.
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="manual-email"
                    className="block text-sm font-bold text-ink-900"
                  >
                    Email λογαριασμού Wrapp
                  </label>
                  <input
                    id="manual-email"
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="π.χ. me+wrapp@example.com"
                    className="mt-2 h-12 w-full rounded-lg border-2 border-ink-300 bg-white px-4 text-base focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
                  />
                </div>
                <div>
                  <label
                    htmlFor="manual-key"
                    className="block text-sm font-bold text-ink-900"
                  >
                    Tenant api_key
                  </label>
                  <input
                    id="manual-key"
                    type="text"
                    value={manualApiKey}
                    onChange={(e) => setManualApiKey(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="π.χ. 4i0lc4uvARlysI4uLhPhL9LcP"
                    className="mt-2 h-12 w-full rounded-lg border-2 border-ink-300 bg-white px-4 font-mono text-sm focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
                  />
                </div>
              </div>

              {error && (
                <div className="mt-6 rounded-lg border-2 border-red-300 bg-red-50 p-4 text-sm font-medium text-red-800">
                  {error}
                </div>
              )}

              <div className="mt-8 space-y-3">
                <button
                  type="button"
                  onClick={submitManual}
                  disabled={busy}
                  className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-brand-700 px-6 text-lg font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
                >
                  {manualBusy ? "Αποθήκευση..." : "Ενεργοποίηση με api_key"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setShowManual(false);
                  }}
                  className="inline-flex h-11 w-full items-center justify-center rounded-lg border-2 border-ink-300 bg-white px-5 text-sm font-semibold text-ink-900 hover:bg-ink-100"
                >
                  Πίσω
                </button>
              </div>
            </>
          )}

          {devMode && !showManual && (
            <div className="mt-8 border-t-2 border-ink-300 pt-6">
              <button
                type="button"
                disabled={simulating}
                onClick={() =>
                  startSimulate(async () => {
                    await devSimulateActivationAction();
                    window.location.reload();
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
