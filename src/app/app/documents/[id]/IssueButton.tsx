"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { attemptIssueAction } from "../actions";

export function IssueButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  function handle() {
    start(async () => {
      const res = await attemptIssueAction(documentId);
      if (res.ok) {
        toast.success("Το παραστατικό διαβιβάστηκε στο myDATA.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Button onClick={handle} disabled={pending} icon={Send}>
      {pending ? "Διαβίβαση..." : "Διαβίβαση στο myDATA"}
    </Button>
  );
}
