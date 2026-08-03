"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { triggerBackupAction } from "./actions";

/**
 * Fire-and-forget "Run backup now" button. Server action returns after
 * mysqldump completes, so the button stays disabled for the full run
 * duration — usually < 60s for small tenants.
 */
export function RunBackupButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        icon={PlayCircle}
        disabled={disabled || pending}
        onClick={() => {
          setError(null);
          start(async () => {
            const res = await triggerBackupAction();
            if (!res.ok) setError(res.error ?? "Απέτυχε.");
            router.refresh();
          });
        }}
      >
        {pending ? "Τρέχει..." : "Εκτέλεση τώρα"}
      </Button>
      {error && <p className="text-xs text-red-800">{error}</p>}
    </div>
  );
}
