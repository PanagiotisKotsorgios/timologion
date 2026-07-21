"use client";

import { useActionState } from "react";
import { submitContactAction, type ContactState } from "./actions";

export function ContactForm() {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(
    submitContactAction,
    undefined,
  );

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

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-16 items-center rounded-full bg-brand-900 px-10 text-lg font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
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
