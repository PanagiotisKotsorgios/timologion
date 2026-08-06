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
  hasCreditNote,
}: {
  id: string;
  status: string;
  wrappInvoiceUrl?: string | null;
  hasCreditNote?: boolean;
}) {
  const router = useRouter();
  const [, start] = useTransition();

  return (
    <DocumentRowMenu
      id={id}
      status={status}
      wrappInvoiceUrl={wrappInvoiceUrl ?? null}
      hasCreditNote={hasCreditNote}
      onDuplicate={() =>
        start(async () => {
          const res = await duplicateDocumentAction(id);
          if (res.ok) router.push(`/app/documents/${res.id}`);
        })
      }
      onCreditNote={() =>
        start(async () => {
          const res = await issueCreditNoteAction(id);
          if (!res.ok) {
            alert(res.error);
            return;
          }
          if (!res.transmitted && res.transmitError) {
            alert(
              res.transmitError +
                "\n\nΤο πιστωτικό αποθηκεύτηκε ως πρόχειρο — δοκίμασε ξανά από την «Επίσημη έκδοση».",
            );
          }
          router.push(`/app/documents/${res.id}`);
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
