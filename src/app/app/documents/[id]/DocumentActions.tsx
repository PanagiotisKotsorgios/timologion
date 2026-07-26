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
            toast.success("Δημιουργήθηκε πρόχειρο πιστωτικού.");
            router.push(`/app/documents/${res.id}`);
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
