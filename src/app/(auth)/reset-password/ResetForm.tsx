"use client";

import { useActionState, useState } from "react";
import { Lock, AlertCircle, KeyRound } from "lucide-react";
import { PasswordField } from "@/components/ui/PasswordField";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import {
  completePasswordResetAction,
  type ResetState,
} from "./actions";

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    completePasswordResetAction,
    undefined,
  );
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="flex items-start gap-3 rounded-2xl border-2 border-red-500/30 bg-red-50 p-5 text-base font-medium text-red-700">
          <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden />
          <span>{state.error}</span>
        </div>
      )}

      <input type="hidden" name="token" value={token} />

      <div>
        <label
          htmlFor="password"
          className="mb-3 flex items-center gap-2 text-base font-semibold text-black"
        >
          <Lock size={16} aria-hidden />
          Νέος κωδικός
        </label>
        <PasswordField
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Τουλάχιστον 8 χαρακτήρες"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordStrength value={password} />
      </div>

      <div>
        <label
          htmlFor="confirm"
          className="mb-3 flex items-center gap-2 text-base font-semibold text-black"
        >
          <Lock size={16} aria-hidden />
          Επιβεβαίωση κωδικού
        </label>
        <PasswordField
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Πληκτρολόγησε ξανά τον κωδικό"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-16 w-full items-center justify-center gap-2 rounded-full bg-brand-900 text-lg font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        <KeyRound size={20} aria-hidden />
        {pending ? "Ενημέρωση..." : "Ορισμός νέου κωδικού"}
      </button>
    </form>
  );
}
