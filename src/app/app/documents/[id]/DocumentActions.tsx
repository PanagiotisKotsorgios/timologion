"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileMinus } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { issueCreditNoteAction } from "../actions";

export function CreditNoteButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await issueCreditNoteAction(documentId);
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          if (res.transmitted) {
            const label =
              res.series || res.number != null
                ? `${res.series ?? ""}${res.number != null ? " #" + res.number : ""}`.trim()
                : "";
            toast.success(
              label
                ? `Το πιστωτικό εκδόθηκε και διαβιβάστηκε στο myDATA (${label}).`
                : "Το πιστωτικό εκδόθηκε και διαβιβάστηκε στο myDATA.",
            );
          } else {
            toast.error(
              (res.transmitError ??
                "Η διαβίβαση δεν ολοκληρώθηκε.") +
                " Το πιστωτικό αποθηκεύτηκε ως πρόχειρο — δοκίμασε ξανά από την «Επίσημη έκδοση».",
            );
          }
          // Land on the detail view so the user sees the final state
          // (MARK, series/number, Wrapp URL) instead of an editor.
          router.push(`/app/documents/${res.id}`);
        })
      }
      className="inline-flex h-10 items-center gap-2 rounded-lg border-2 border-red-700 bg-red-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 sm:text-base"
    >
      <FileMinus size={16} strokeWidth={2.5} aria-hidden />
      {pending ? "Έκδοση..." : "Έκδοση πιστωτικού"}
    </button>
  );
}
