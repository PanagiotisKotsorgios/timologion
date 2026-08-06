"use client";

import { useActionState, useState, useTransition } from "react";
import { LogIn, ShieldCheck, AlertCircle } from "lucide-react";
import {
  resendOAuthMfaAction,
  verifyOAuthMfaAction,
  type OAuthMfaState,
} from "./actions";

export function OAuthMfaForm() {
  const [state, formAction, pending] = useActionState<OAuthMfaState, FormData>(
    verifyOAuthMfaAction,
    undefined,
  );
  const [resendPending, startResend] = useTransition();
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="flex items-start gap-3 rounded-2xl border-2 border-red-500/30 bg-red-50 p-5 text-base font-medium text-red-700">
          <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden />
          <span>{state.error}</span>
        </div>
      )}
      {resendMsg && !state?.error && (
        <div className="flex items-start gap-3 rounded-2xl border-2 border-emerald-500/30 bg-emerald-50 p-5 text-base font-medium text-emerald-800">
          <ShieldCheck size={20} className="mt-0.5 shrink-0" aria-hidden />
          <span>{resendMsg}</span>
        </div>
      )}
      <div>
        <label
          htmlFor="totp"
          className="mb-3 flex items-center gap-2 text-base font-semibold text-black"
        >
          <ShieldCheck size={16} aria-hidden />
          Κωδικός επιβεβαίωσης
        </label>
        <input
          id="totp"
          name="totp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={6}
          placeholder="123456"
          className="big-input font-mono text-2xl tracking-widest"
        />
        <p className="mt-2 text-sm text-black/60">
          Ισχύει για 10 λεπτά. Δεν έφτασε; Ζήτησε νέο κωδικό.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-16 flex-1 items-center justify-center gap-2 rounded-full bg-brand-900 text-lg font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          <LogIn size={20} aria-hidden />
          {pending ? "Επιβεβαίωση..." : "Επιβεβαίωση"}
        </button>
        <button
          type="button"
          disabled={resendPending}
          onClick={() =>
            startResend(async () => {
              const res = await resendOAuthMfaAction();
              setResendMsg(res?.error ?? null);
            })
          }
          className="inline-flex h-16 items-center justify-center rounded-full border-2 border-brand-900/40 px-6 text-base font-semibold text-brand-900 transition-colors hover:bg-brand-900/5 disabled:opacity-60"
        >
          {resendPending ? "Αποστολή..." : "Στείλε νέο κωδικό"}
        </button>
      </div>
    </form>
  );
}
