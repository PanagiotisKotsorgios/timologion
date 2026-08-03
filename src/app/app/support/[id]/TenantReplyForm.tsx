"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { tenantReplyAction } from "./actions";

export function TenantReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3">
      {error && <Alert tone="danger">{error}</Alert>}
      <Textarea
        rows={6}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Απάντηση προς την ομάδα υποστήριξης..."
      />
      <div className="flex justify-end">
        <Button
          type="button"
          icon={Send}
          disabled={pending || !body.trim()}
          onClick={() => {
            setError(null);
            const fd = new FormData();
            fd.set("ticketId", ticketId);
            fd.set("body", body);
            start(async () => {
              const res = await tenantReplyAction(fd);
              if (res.ok) {
                setBody("");
                router.refresh();
              } else {
                setError(res.error);
              }
            });
          }}
        >
          {pending ? "Αποστολή..." : "Αποστολή"}
        </Button>
      </div>
    </div>
  );
}
