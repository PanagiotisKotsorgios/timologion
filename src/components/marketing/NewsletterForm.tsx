"use client";

import { useActionState } from "react";
import { subscribeNewsletterAction, type NewsletterState } from "./newsletter-action";

export function NewsletterForm() {
  const [state, formAction, pending] = useActionState<NewsletterState, FormData>(
    subscribeNewsletterAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          name="email"
          required
          placeholder="Το email σου"
          className="h-14 flex-1 rounded-full border-2 border-white/15 bg-white/10 px-6 text-base text-white placeholder:text-white/50 focus:border-white/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-14 rounded-full bg-white px-8 text-base font-semibold text-brand-900 transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {pending ? "..." : "Εγγραφή"}
        </button>
      </div>
      {state?.success && (
        <p className="text-sm text-white/80">{state.success}</p>
      )}
      {state?.error && <p className="text-sm text-red-300">{state.error}</p>}
      <p className="text-xs text-white/50">
        Χωρίς spam. Ένα σύντομο newsletter τον μήνα, με νέα και οδηγούς.
      </p>
    </form>
  );
}
