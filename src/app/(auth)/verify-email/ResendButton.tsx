"use client";

import { useState, useTransition } from "react";
import { RefreshCcw, CheckCircle2 } from "lucide-react";
import { resendVerificationAction } from "./actions";

export function ResendButton() {
  const [state, setState] = useState<
    { status: "idle" | "sent" | "error"; message?: string }
  >({ status: "idle" });
  const [pending, startTx] = useTransition();

  function submit() {
    startTx(async () => {
      const res = await resendVerificationAction();
      if (res.ok) setState({ status: "sent" });
      else setState({ status: "error", message: res.error });
    });
  }

  if (state.status === "sent") {
    return (
      <div className="inline-flex items-center gap-2 rounded-2xl border-2 border-emerald-500/30 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-800">
        <CheckCircle2 size={16} />
        Στάλθηκε νέο email επιβεβαίωσης.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="inline-flex h-14 items-center gap-2 rounded-full bg-brand-900 px-6 text-base font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        <RefreshCcw size={18} aria-hidden />
        {pending ? "Αποστολή..." : "Αποστολή νέου email επιβεβαίωσης"}
      </button>
      {state.status === "error" && state.message && (
        <p className="text-sm text-red-700">{state.message}</p>
      )}
    </div>
  );
}
