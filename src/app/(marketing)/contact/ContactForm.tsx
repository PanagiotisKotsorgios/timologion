"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { submitContactAction, type ContactState } from "./actions";

export function ContactForm() {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(
    submitContactAction,
    undefined,
  );
  const [acceptTerms, setAcceptTerms] = useState(false);

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-2xl border-2 border-red-500/30 bg-red-50 p-5 text-base font-medium text-red-700">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-2xl border-2 border-brand-900/20 bg-brand-50 p-5 text-base font-medium text-brand-900">
          {state.success}
        </div>
      )}

      <Field label="Ονοματεπώνυμο" htmlFor="fullName">
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          maxLength={120}
          placeholder="Το πλήρες όνομά σου"
          className="big-input"
        />
      </Field>

      <Field label="Email" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          required
          maxLength={160}
          placeholder="you@example.gr"
          className="big-input"
        />
      </Field>

      <Field label="Επιχείρηση" hint="Προαιρετικά" htmlFor="company">
        <input
          id="company"
          name="company"
          type="text"
          maxLength={160}
          placeholder="Η επωνυμία της επιχείρησης"
          className="big-input"
        />
      </Field>

      <Field label="Μήνυμα" htmlFor="message">
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          minLength={10}
          maxLength={4000}
          placeholder="Πες μας πώς μπορούμε να βοηθήσουμε..."
          className="big-textarea"
        />
      </Field>

      {/* GDPR consent — required by the same rule that runs server-side
          in actions.ts. Disabling the submit button when unchecked is
          purely UX; the Zod schema won't accept a submission either. */}
      <label
        htmlFor="acceptTerms"
        className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-black/10 bg-black/[0.02] p-4 text-sm text-black/80 transition-colors hover:border-brand-900/30"
      >
        <input
          id="acceptTerms"
          name="acceptTerms"
          type="checkbox"
          required
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-black/40 text-brand-900 accent-brand-900 focus:ring-2 focus:ring-brand-900/20 focus:ring-offset-0"
        />
        <span>
          Αποδέχομαι τους{" "}
          <Link
            href="/terms"
            className="font-semibold text-brand-900 underline underline-offset-2 hover:opacity-70"
            target="_blank"
          >
            Όρους Χρήσης
          </Link>{" "}
          και την{" "}
          <Link
            href="/privacy"
            className="font-semibold text-brand-900 underline underline-offset-2 hover:opacity-70"
            target="_blank"
          >
            Πολιτική Απορρήτου
          </Link>
          . Τα στοιχεία μου θα χρησιμοποιηθούν για να απαντήσουμε στο
          μήνυμά μου.
        </span>
      </label>

      <button
        type="submit"
        disabled={pending || !acceptTerms}
        className="inline-flex h-16 items-center rounded-full bg-brand-900 px-10 text-lg font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {pending ? "Αποστολή..." : "Αποστολή μηνύματος"}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <label
          htmlFor={htmlFor}
          className="text-base font-semibold text-black"
        >
          {label}
        </label>
        {hint && <span className="text-sm text-black/50">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
