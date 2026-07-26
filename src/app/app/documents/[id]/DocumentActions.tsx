"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileMinus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { issueCreditNoteAction } from "../actions";

export function CreditNoteButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="secondary"
      size="md"
      icon={FileMinus}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await issueCreditNoteAction(documentId);
          if (res.ok) {
            toast.success(
              "Πιστωτικό έτοιμο για επεξεργασία — επίλεξε αποθήκευση ή διαβίβαση.",
            );
            // Land on the editor so the user consciously picks between
            // "Αποθήκευση ως πρόχειρο" and "Διαβίβαση στο myDATA" instead
            // of a silent draft creation.
            router.push(`/app/documents/${res.id}/edit`);
          } else {
            toast.error(res.error);
          }
        })
      }
    >
      {pending ? "Δημιουργία..." : "Έκδοση πιστωτικού"}
    </Button>
  );
}
