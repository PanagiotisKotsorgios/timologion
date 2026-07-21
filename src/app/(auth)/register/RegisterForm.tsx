"use client";

import { useActionState, useState } from "react";
import { UserPlus, User, Mail, Lock, AlertCircle } from "lucide-react";
import { PasswordField } from "@/components/ui/PasswordField";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import { registerAction, type RegisterState } from "./actions";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(
    registerAction,
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

      <div>
        <label
          htmlFor="fullName"
          className="mb-3 flex items-center gap-2 text-base font-semibold text-black"
        >
          <User size={16} aria-hidden />
          Ονοματεπώνυμο
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          minLength={2}
          placeholder="Το πλήρες όνομά σου"
          className="big-input"
        />
      </div>

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
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <label
            htmlFor="password"
            className="flex items-center gap-2 text-base font-semibold text-black"
          >
            <Lock size={16} aria-hidden />
            Κωδικός
          </label>
          <span className="text-sm text-black/50">
            Τουλάχιστον 8 χαρακτήρες
          </span>
        </div>
        <PasswordField
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordStrength value={password} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-16 w-full items-center justify-center gap-2 rounded-full bg-brand-900 text-lg font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        <UserPlus size={20} aria-hidden />
        {pending ? "Δημιουργία λογαριασμού..." : "Δημιουργία λογαριασμού"}
      </button>

      <p className="text-sm leading-relaxed text-black/60">
        Δημιουργώντας λογαριασμό, αποδέχεσαι τους{" "}
        <a
          href="/terms"
          className="font-semibold text-brand-900 underline underline-offset-4 hover:opacity-70"
        >
          όρους χρήσης
        </a>{" "}
        και την{" "}
        <a
          href="/privacy"
          className="font-semibold text-brand-900 underline underline-offset-4 hover:opacity-70"
        >
          πολιτική απορρήτου
        </a>
        .
      </p>
    </form>
  );
}
