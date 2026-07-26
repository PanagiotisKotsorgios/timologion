"use client";

import { useState, useTransition } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { resendVerificationAction } from "@/app/(auth)/verify-email/actions";

/**
 * Inline resend button for the top-of-app verify-email banner. Sends the
 * confirmation email in-place — no page hop — so users can trigger it with
 * one click without leaving their current workflow.
 */
export function VerifyEmailBannerResend() {
  const [state, setState] = useState<{ status: "idle" | "sent" | "error"; message?: string }>({
    status: "idle",
  });
  const [pending, startTx] = useTransition();

  function resend() {
    startTx(async () => {
      const res = await resendVerificationAction();
      if (res.ok) {
        setState({ status: "sent" });
      } else {
        setState({ status: "error", message: res.error });
      }
    });
  }

  if (state.status === "sent") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-800">
        <CheckCircle2 size={14} aria-hidden />
        Στάλθηκε νέο email — έλεγξε τα εισερχόμενά σου
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={resend}
      disabled={pending}
      className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-900 underline underline-offset-2 hover:text-amber-800 disabled:opacity-60"
      title={state.message}
    >
      <Send size={14} aria-hidden />
      {pending ? "Αποστολή..." : "Στείλε ξανά το email"}
    </button>
  );
}
