"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";

const STORAGE_KEY = "etl_cookie_consent";
const CHOICE = { accepted: "accepted", declined: "declined" } as const;
type Choice = (typeof CHOICE)[keyof typeof CHOICE];

function readChoice(): Choice | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${STORAGE_KEY}=`));
  if (!match) return null;
  const v = match.slice(STORAGE_KEY.length + 1);
  if (v === CHOICE.accepted || v === CHOICE.declined) return v;
  return null;
}

function writeChoice(choice: Choice) {
  // 6-month cookie, path=/, samesite lax so it survives internal navigations.
  const oneYear = 60 * 60 * 24 * 180;
  document.cookie = `${STORAGE_KEY}=${choice}; Max-Age=${oneYear}; Path=/; SameSite=Lax`;
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Small delay so it doesn't flash on first paint.
    const id = window.setTimeout(() => {
      if (!readChoice()) setVisible(true);
    }, 500);
    return () => window.clearTimeout(id);
  }, []);

  function accept() {
    writeChoice(CHOICE.accepted);
    setVisible(false);
  }

  function decline() {
    writeChoice(CHOICE.declined);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-body"
      className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-4xl rounded-2xl border-2 border-brand-900/20 bg-white p-4 shadow-2xl sm:inset-x-6 sm:bottom-6 sm:p-6"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <span
          aria-hidden
          className="hidden shrink-0 rounded-2xl bg-brand-50 p-3 text-brand-800 sm:inline-flex"
        >
          <Cookie size={22} />
        </span>

        <div className="flex-1">
          <p
            id="cookie-banner-title"
            className="text-base font-bold text-brand-900 sm:text-lg"
          >
            Χρησιμοποιούμε cookies.
          </p>
          <p
            id="cookie-banner-body"
            className="mt-1.5 text-sm text-ink-700 sm:text-[15px]"
          >
            Απαραίτητα cookies για τη σύνδεση και προαιρετικά για βελτίωση της
            εμπειρίας. Διάβασε την{" "}
            <Link
              href="/cookies"
              className="font-semibold text-brand-800 underline underline-offset-2 hover:text-brand-900"
            >
              πολιτική cookies
            </Link>
            .
          </p>

          <div className="mt-4 flex flex-wrap gap-2 sm:mt-5">
            <button
              type="button"
              onClick={accept}
              className="inline-flex h-11 items-center justify-center rounded-full bg-brand-900 px-5 text-sm font-semibold text-white hover:bg-black sm:h-12 sm:px-6 sm:text-base"
            >
              Αποδέχομαι όλα
            </button>
            <button
              type="button"
              onClick={decline}
              className="inline-flex h-11 items-center justify-center rounded-full border-2 border-brand-900/30 bg-white px-5 text-sm font-semibold text-brand-900 hover:border-brand-900 sm:h-12 sm:px-6 sm:text-base"
            >
              Μόνο απαραίτητα
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={decline}
          aria-label="Κλείσιμο"
          className="ml-1 grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-ink-100 hover:text-ink-900"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
