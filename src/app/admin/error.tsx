"use client";

import { useEffect } from "react";
import { LayoutDashboard, RefreshCcw } from "lucide-react";
import { ErrorScreen } from "@/components/ui/ErrorScreen";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[admin-error]", error);
  }, [error]);

  return (
    <ErrorScreen
      code="500"
      tone="danger"
      title="Σφάλμα στη διαχείριση πλατφόρμας"
      description={
        <>
          Δεν καταφέραμε να φορτώσουμε αυτή τη σελίδα. Δοκίμασε ξανά ή
          επίστρεψε στην επισκόπηση.
          {error.digest && (
            <span className="mt-3 block font-mono text-xs text-ink-500">
              Κωδικός σφάλματος: {error.digest}
            </span>
          )}
        </>
      }
      actions={[
        { href: "#", label: "Δοκίμασε ξανά", icon: RefreshCcw },
        {
          href: "/admin",
          label: "Επισκόπηση",
          variant: "secondary",
          icon: LayoutDashboard,
        },
      ]}
      extra={
        <p className="text-sm text-ink-500">
          <button
            type="button"
            onClick={reset}
            className="font-semibold text-brand-800 hover:text-brand-900"
          >
            Επαναφόρτωση χωρίς full refresh
          </button>
        </p>
      }
    />
  );
}
