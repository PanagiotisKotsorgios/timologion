import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, RotateCcw, Beaker } from "lucide-react";

/**
 * Landing page for /staging. The middleware set the runtime-mode
 * cookie on arrival so any Wrapp calls fired from this page already
 * hit staging.wrapp.ai. Purpose here is purely to explain what the
 * mode does and give the user a clean way in/out.
 */
export const metadata: Metadata = {
  title: "Λειτουργία δοκιμών · timologion",
  robots: { index: false, follow: false, nocache: true },
};

export default function StagingLandingPage() {
  return (
    <main className="min-h-screen bg-ink-100 px-4 py-12 md:py-20">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border-2 border-amber-400 bg-white shadow-xl">
          <div className="flex items-center gap-3 rounded-t-3xl border-b-2 border-amber-300 bg-amber-100 px-8 py-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-500 text-white">
              <Beaker size={22} strokeWidth={2.5} aria-hidden />
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-amber-800">
                Λειτουργία δοκιμών
              </p>
              <h1 className="mt-0.5 text-2xl font-extrabold text-amber-900">
                STAGING mode ενεργό
              </h1>
            </div>
          </div>

          <div className="px-8 py-8">
            <p className="text-base leading-relaxed text-ink-800">
              Είσαι σε λειτουργία δοκιμών. Όλες οι κλήσεις προς τον πάροχο
              ηλεκτρονικής τιμολόγησης (Wrapp) φτάνουν στο staging περιβάλλον
              — τίποτα δεν πάει στο <strong>πραγματικό myDATA</strong>.
            </p>

            <ul className="mt-5 space-y-2.5 text-sm text-ink-700">
              <Bullet>
                Χρησιμοποίησέ το για να δοκιμάζεις νέες λειτουργίες, τύπους
                παραστατικών ή πλήρη ροή έκδοσης χωρίς επιπτώσεις.
              </Bullet>
              <Bullet>
                Οι λογαριασμοί, οι πελάτες και οι ρυθμίσεις σου παραμένουν οι
                ίδιοι — αλλάζει μόνο ο προορισμός των Wrapp κλήσεων.
              </Bullet>
              <Bullet>
                Θα δεις ένα κίτρινο μπάνερ στην κορυφή κάθε σελίδας όσο η
                λειτουργία δοκιμών είναι ενεργή.
              </Bullet>
            </ul>

            <div className="mt-6 rounded-xl border-2 border-red-200 bg-red-50 p-4">
              <p className="flex items-start gap-2 text-sm font-semibold text-red-800">
                <AlertTriangle
                  size={16}
                  strokeWidth={2.5}
                  className="mt-0.5 shrink-0 text-red-700"
                  aria-hidden
                />
                Παραστατικά που εκδίδονται εδώ <strong>δεν έχουν νομική
                ισχύ</strong> και δεν καταχωρούνται στο myDATA. Μη τα δώσεις
                σε πελάτες.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app"
                className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-900 px-6 text-base font-bold text-white transition-colors hover:bg-black"
              >
                Άνοιγμα εφαρμογής σε staging
                <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
              </Link>
              <Link
                href="/staging/exit"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-lg border-2 border-ink-300 bg-white px-6 text-sm font-bold text-ink-800 transition-colors hover:bg-ink-50"
              >
                <RotateCcw size={15} strokeWidth={2.5} aria-hidden />
                Επιστροφή σε παραγωγή
              </Link>
            </div>

            <p className="mt-6 text-xs text-ink-500">
              Μπορείς οποιαδήποτε στιγμή να πατήσεις «Έξοδος από staging» από
              το μπάνερ που εμφανίζεται στην κορυφή κάθε σελίδας.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span
        aria-hidden
        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600"
      />
      <span>{children}</span>
    </li>
  );
}
