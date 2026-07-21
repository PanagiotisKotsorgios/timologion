"use client";

import { useEffect } from "react";
import { Home, RefreshCcw } from "lucide-react";
import { ErrorScreen } from "@/components/ui/ErrorScreen";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[global-error]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white">
      <ErrorScreen
        code="500"
        tone="danger"
        title="Κάτι πήγε στραβά"
        description={
          <>
            Παρουσιάστηκε ένα απροσδόκητο σφάλμα. Δοκίμασε να ανανεώσεις τη
            σελίδα. Αν το πρόβλημα επιμένει, επικοινώνησε με την υποστήριξη.
            {error.digest && (
              <span className="mt-3 block font-mono text-xs text-ink-500">
                Κωδικός σφάλματος: {error.digest}
              </span>
            )}
          </>
        }
        actions={[
          {
            href: "#",
            label: "Ανανέωση",
            icon: RefreshCcw,
          },
          {
            href: "/",
            label: "Αρχική σελίδα",
            variant: "secondary",
            icon: Home,
          },
        ]}
        extra={
          <p className="text-sm text-ink-500">
            <button
              type="button"
              onClick={reset}
              className="font-semibold text-brand-800 hover:text-brand-900"
            >
              Δοκίμασε ξανά
            </button>{" "}
            χωρίς πλήρη ανανέωση.
          </p>
        }
      />
    </div>
  );
}
