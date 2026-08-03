"use client";

import { ExternalLink } from "lucide-react";

/**
 * Cancellation is handled by the actual biller (Wrapp) — a local
 * "cancel" button would leave a working paid Wrapp subscription in
 * the dark, so we route users to their Wrapp account instead.
 */
export function CancelButton() {
  return (
    <a
      href="https://wrapp.ai/el/users/sign_in"
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-11 items-center gap-2 rounded-lg border-2 border-red-700 bg-white px-4 text-sm font-bold text-red-700 shadow-sm transition-colors hover:bg-red-50"
    >
      <ExternalLink size={14} strokeWidth={2.5} aria-hidden />
      Ακύρωση συνδρομής στη Wrapp
    </a>
  );
}
