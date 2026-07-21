"use client";

import { useActionState } from "react";
import { Mail, AlertCircle, CheckCircle2, Send } from "lucide-react";
import {
  requestPasswordResetAction,
  type ForgotState,
} from "./actions";

export function ForgotForm() {
  const [state, formAction, pending] = useActionState<ForgotState, FormData>(
    requestPasswordResetAction,
    undefined,
  );

  if (state?.success) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border-2 border-emerald-500/30 bg-emerald-50 p-5 text-base font-medium text-emerald-800">
        <CheckCircle2 size={22} className="mt-0.5 shrink-0" aria-hidden />
        <p>{state.success}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="flex items-start gap-3 rounded-2xl border-2 border-red-500/30 bg-red-50 p-5 text-base font-medium text-red-700">
          <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden />
          <span>{state.error}</span>
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="mb-3 flex items-center gap-2 text-base font-semibold text-black"
        >
          <Mail size={16} aria-hidden />
          Email λογαριασμού
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.gr"
          className="big-input"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-16 w-full items-center justify-center gap-2 rounded-full bg-brand-900 text-lg font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        <Send size={20} aria-hidden />
        {pending ? "Αποστολή..." : "Αποστολή συνδέσμου"}
      </button>
    </form>
  );
}
