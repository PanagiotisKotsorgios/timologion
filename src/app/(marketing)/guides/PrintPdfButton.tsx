"use client";

import { Download } from "lucide-react";

/**
 * "Λήψη PDF" — triggers the browser's native print-to-PDF dialog.
 * Paired with the `@media print` styles in globals.css (see the
 * `.guide-print-*` rules), which strip the site chrome (header, footer,
 * sidebar, hero) and lay out just the guide body cleanly on A4.
 *
 * Deliberately client-only (no server-side PDF pipeline) — browsers
 * already ship an excellent PDF renderer and users get the "Save as
 * PDF" option in the same print dialog. No dependency on Chromium /
 * puppeteer server-side, no queue, no email delivery.
 */
export function PrintPdfButton({ label = "Λήψη PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex h-11 items-center gap-2 rounded-full border-2 border-white/25 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur transition-colors hover:border-white/40 hover:bg-white/20"
      aria-label="Εκτύπωση ή αποθήκευση ως PDF"
    >
      <Download size={15} strokeWidth={2.5} aria-hidden />
      {label}
    </button>
  );
}
