"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { attemptIssueAction } from "../actions";

export function IssueButton({ documentId }: { documentId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function handle() {
    setMessage(null);
    start(async () => {
      const res = await attemptIssueAction(documentId);
      if (!res.ok) setMessage(res.error);
    });
  }

  return (
    <div className="space-y-3">
      <Button onClick={handle} disabled={pending}>
        {pending ? "Επικοινωνία..." : "Επίσημη έκδοση"}
      </Button>
      {message && <Alert tone="warning">{message}</Alert>}
    </div>
  );
}
