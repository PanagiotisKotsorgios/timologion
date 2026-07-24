"use client";

import { useEffect, useState } from "react";

/**
 * SVG-based Google and Facebook logos with brand colors. Rendered inline so we
 * don't add another icon dependency. Google navigates through the OAuth flow;
 * Facebook shows a "coming soon" popup because the FB app is still pending
 * review.
 */
export function SocialLoginButtons({ mode }: { mode: "login" | "register" }) {
  const verb = mode === "login" ? "Σύνδεση" : "Εγγραφή";
  const [showFbNotice, setShowFbNotice] = useState(false);

  useEffect(() => {
    if (!showFbNotice) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowFbNotice(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showFbNotice]);

  return (
    <div className="space-y-3">
      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t-2 border-black/[0.08]" />
        </div>
        <span className="relative bg-white px-4 text-sm font-medium text-black/60">
          ή {verb.toLowerCase()} με
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href="/api/auth/google/start"
          className="inline-flex h-14 items-center justify-center gap-3 rounded-full border-2 border-black/10 bg-white font-semibold text-black transition-transform hover:-translate-y-0.5 hover:border-black/30"
        >
          <GoogleIcon />
          {verb} με Google
        </a>
        <button
          type="button"
          onClick={() => setShowFbNotice(true)}
          style={{ backgroundColor: "#1877F2", color: "#ffffff" }}
          className="inline-flex h-14 items-center justify-center gap-3 rounded-full font-semibold transition-transform hover:-translate-y-0.5 hover:opacity-95"
        >
          <FacebookIcon />
          {verb} με Facebook
        </button>
      </div>

      {showFbNotice && (
        <FacebookComingSoonModal onClose={() => setShowFbNotice(false)} />
      )}
    </div>
  );
}

function FacebookComingSoonModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fb-coming-soon-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Κλείσιμο"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-md rounded-3xl border-2 border-black/10 bg-white p-8 shadow-2xl">
        <div
          className="mx-auto grid h-16 w-16 place-items-center rounded-full"
          style={{ backgroundColor: "#1877F2" }}
        >
          <span className="text-white">
            <FacebookIcon />
          </span>
        </div>
        <h2
          id="fb-coming-soon-title"
          className="mt-6 text-center text-2xl font-extrabold text-brand-900"
        >
          Έρχεται σύντομα
        </h2>
        <p className="mt-4 text-center text-base text-black/70">
          Η σύνδεση μέσω Facebook δεν είναι ακόμη διαθέσιμη για τους χρήστες.
          Χρησιμοποίησε προσωρινά τη Σύνδεση με Google ή το email σου.
        </p>
        <p className="mt-4 text-center text-sm text-black/60">
          Θα σε ενημερώσουμε μόλις ενεργοποιηθεί. Για βοήθεια:{" "}
          <a
            href="mailto:support@timologion.gr"
            className="font-semibold text-brand-900 underline underline-offset-4"
          >
            support@timologion.gr
          </a>
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-8 inline-flex h-14 w-full items-center justify-center rounded-full bg-brand-900 text-base font-semibold text-white transition-transform hover:-translate-y-0.5"
        >
          Εντάξει, το κατάλαβα
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073C0 18.062 4.388 23.027 10.125 23.928v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
