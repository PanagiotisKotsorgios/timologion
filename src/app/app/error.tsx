"use client";

import { useEffect } from "react";
import { LayoutDashboard, RefreshCcw, Lock } from "lucide-react";
import { ErrorScreen } from "@/components/ui/ErrorScreen";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[app-error]", error);
  }, [error]);

  // Detect ForbiddenError thrown by src/lib/rbac.ts on unauthorized actions.
  const isForbidden = error.name === "ForbiddenError";

  if (isForbidden) {
    return (
      <ErrorScreen
        code="403"
        tone="warning"
        title="Δεν έχεις πρόσβαση σε αυτή τη σελίδα"
        description={
          <>
            Ο τρέχων ρόλος σου δεν έχει τα δικαιώματα που χρειάζονται. Ζήτησε
            πρόσβαση από τον διαχειριστή της επιχείρησης ή επίστρεψε στον
            πίνακα.
          </>
        }
        actions={[
          {
            href: "/app",
            label: "Πίνακας ελέγχου",
            icon: LayoutDashboard,
          },
        ]}
        extra={<Lock size={22} className="text-ink-500 mx-auto" aria-hidden />}
      />
    );
  }

  return (
    <ErrorScreen
      code="500"
      tone="danger"
      title="Κάτι πήγε στραβά"
      description={
        <>
          Δεν καταφέραμε να φορτώσουμε αυτή τη σελίδα. Δοκίμασε ξανά — αν το
          πρόβλημα επιμένει, επικοινώνησε με την υποστήριξη.
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
          label: "Δοκίμασε ξανά",
          icon: RefreshCcw,
        },
        {
          href: "/app",
          label: "Πίνακας ελέγχου",
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
