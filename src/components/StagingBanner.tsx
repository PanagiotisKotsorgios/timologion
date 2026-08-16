import { isStagingMode } from "@/lib/runtime-mode";
import { AlertTriangle } from "lucide-react";

/**
 * Sitewide "you are in staging mode" strip. Rendered inside both the
 * app layout and the admin layout so it's unmistakable regardless of
 * where the user landed. Server component — reads the runtime-mode
 * cookie via getRuntimeMode() and returns null in production so it's
 * a zero-DOM no-op for real tenants.
 */
export async function StagingBanner() {
  if (!(await isStagingMode())) return null;
  return (
    <div className="sticky top-0 z-[70] flex flex-wrap items-center justify-center gap-3 border-b-2 border-amber-500 bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm">
      <AlertTriangle
        size={16}
        strokeWidth={2.5}
        className="text-amber-700"
        aria-hidden
      />
      <span>
        Λειτουργία δοκιμών (STAGING) — όλες οι κλήσεις προς Wrapp φτάνουν στο{" "}
        <code className="mono rounded bg-amber-200/60 px-1.5 py-0.5 text-xs">
          staging.wrapp.ai
        </code>
        . Τα παραστατικά που εκδίδεις εδώ δεν φτάνουν στο πραγματικό myDATA.
      </span>
      <a
        href="/staging/exit"
        className="inline-flex items-center gap-1.5 rounded-full border-2 border-amber-700 bg-amber-700 px-3 py-1 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-amber-800"
      >
        Έξοδος από staging
      </a>
    </div>
  );
}
