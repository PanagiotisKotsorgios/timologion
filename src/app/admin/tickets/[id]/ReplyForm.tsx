"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, StickyNote } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { replyToTicketAction } from "./actions";

export function ReplyForm({
  ticketId,
  customerEmail,
  senderName,
}: {
  ticketId: string;
  customerEmail: string;
  senderName: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isInternal, setInternal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3">
      {error && <Alert tone="danger">{error}</Alert>}
      <Textarea
        rows={7}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          isInternal
            ? "Εσωτερική σημείωση — δεν βλέπει ο πελάτης."
            : `Απάντηση προς ${customerEmail} · υπογραφή ως ${senderName}`
        }
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isInternal}
          onChange={(e) => setInternal(e.target.checked)}
          className="h-4 w-4 rounded border-ink-500 text-brand-700"
        />
        <span className="font-semibold">
          Internal note (δεν στέλνεται στον πελάτη)
        </span>
      </label>
      <div className="flex justify-end">
        <Button
          type="button"
          icon={isInternal ? StickyNote : Send}
          variant={isInternal ? "secondary" : "primary"}
          disabled={pending || !body.trim()}
          onClick={() => {
            setError(null);
            const fd = new FormData();
            fd.set("ticketId", ticketId);
            fd.set("body", body);
            if (isInternal) fd.set("isInternal", "1");
            start(async () => {
              const res = await replyToTicketAction(fd);
              if (res.ok) {
                setBody("");
                router.refresh();
              } else {
                setError(res.error);
              }
            });
          }}
        >
          {pending
            ? "Αποστολή..."
            : isInternal
              ? "Προσθήκη σημείωσης"
              : "Αποστολή απάντησης"}
        </Button>
      </div>
    </div>
  );
}
