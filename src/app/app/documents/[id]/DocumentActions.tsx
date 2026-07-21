"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  FileMinus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  duplicateDocumentAction,
  issueCreditNoteAction,
} from "../actions";

export function DuplicateButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="secondary"
      size="md"
      icon={Copy}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await duplicateDocumentAction(documentId);
          if (res.ok) router.push(`/app/documents/${res.id}`);
        })
      }
    >
      {pending ? "Αντιγραφή..." : "Αντιγραφή"}
    </Button>
  );
}

export function CreditNoteButton({ documentId }: { documentId: string }) {
  const router = useRouter();
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
          if (res.ok) router.push(`/app/documents/${res.id}`);
          else alert(res.error);
        })
      }
    >
      {pending ? "Δημιουργία..." : "Έκδοση πιστωτικού"}
    </Button>
  );
}
