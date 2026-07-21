"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cancelSubscriptionAction } from "./actions";

export function CancelButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      variant="danger"
      size="md"
      icon={XCircle}
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            "Είσαι σίγουρος ότι θες να καταργήσεις τη συνδρομή σου; Η συνδρομή θα ακυρωθεί άμεσα.",
          )
        )
          return;
        start(async () => {
          await cancelSubscriptionAction();
          router.refresh();
        });
      }}
    >
      {pending ? "Ακύρωση..." : "Κατάργηση συνδρομής"}
    </Button>
  );
}
