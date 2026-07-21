"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LogIn, Mail, Lock, AlertCircle, ShieldCheck } from "lucide-react";
import { PasswordField } from "@/components/ui/PasswordField";
import { loginAction, type LoginState } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    undefined,
  );

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
          Email
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

      <div>
        <label
          htmlFor="password"
          className="mb-3 flex items-center gap-2 text-base font-semibold text-black"
        >
          <Lock size={16} aria-hidden />
          Κωδικός
        </label>
        <PasswordField
          id="password"
          name="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </div>

      {state?.needsOtp && (
        <div>
          <label
            htmlFor="totp"
            className="mb-3 flex items-center gap-2 text-base font-semibold text-black"
          >
            <ShieldCheck size={16} aria-hidden />
            Κωδικός 2FA
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
            Πάρε τον κωδικό από την εφαρμογή Authenticator.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-base">
        <label
          htmlFor="remember"
          className="inline-flex cursor-pointer items-center gap-2.5 font-semibold text-black"
        >
          <input
            id="remember"
            name="remember"
            type="checkbox"
            defaultChecked
            className="h-5 w-5 rounded-md border-2 border-brand-900/40 text-brand-900 focus:ring-2 focus:ring-brand-900/20 focus:ring-offset-0"
          />
          <span>Να με θυμάσαι</span>
        </label>

        <Link
          href="/forgot-password"
          className="font-semibold text-brand-900 underline underline-offset-4 hover:opacity-70"
        >
          Ξέχασες τον κωδικό;
        </Link>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-16 w-full items-center justify-center gap-2 rounded-full bg-brand-900 text-lg font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        <LogIn size={20} aria-hidden />
        {pending ? "Σύνδεση..." : "Σύνδεση"}
      </button>
    </form>
  );
}
