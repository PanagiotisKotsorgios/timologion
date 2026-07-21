"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  duplicateDocumentAction,
  issueCreditNoteAction,
  attemptIssueAction,
  deleteDraftAction,
} from "./actions";
import { DocumentRowMenu } from "./RowMenu";

export function RowActions({
  id,
  status,
  wrappInvoiceUrl,
}: {
  id: string;
  status: string;
  wrappInvoiceUrl?: string | null;
}) {
  const router = useRouter();
  const [, start] = useTransition();

  return (
    <DocumentRowMenu
      id={id}
      status={status}
      wrappInvoiceUrl={wrappInvoiceUrl ?? null}
      onDuplicate={() =>
        start(async () => {
          const res = await duplicateDocumentAction(id);
          if (res.ok) router.push(`/app/documents/${res.id}`);
        })
      }
      onCreditNote={() =>
        start(async () => {
          const res = await issueCreditNoteAction(id);
          if (res.ok) router.push(`/app/documents/${res.id}`);
          else alert(res.error);
        })
      }
      onIssue={() =>
        start(async () => {
          const res = await attemptIssueAction(id);
          if (!res.ok) alert(res.error);
          else router.refresh();
        })
      }
      onDelete={() => {
        if (!confirm("Οριστική διαγραφή του πρόχειρου;")) return;
        start(async () => {
          const res = await deleteDraftAction(id);
          if (res.ok) router.refresh();
          else alert(res.error);
        });
      }}
    />
  );
}
