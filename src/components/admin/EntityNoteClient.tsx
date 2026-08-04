"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StickyNote, Trash2 } from "lucide-react";
import {
  addEntityNoteAction,
  deleteEntityNoteAction,
} from "@/lib/entity-notes-actions";

export function EntityNoteForm({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="space-y-2">
      <textarea
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Νέα σημείωση..."
        className="w-full rounded-lg border-2 border-ink-300 bg-white p-3 text-sm outline-none focus:border-brand-700"
      />
      <div className="flex justify-end">
        <button
          type="button"
          disabled={pending || !body.trim()}
          onClick={() => {
            const fd = new FormData();
            fd.set("entityType", entityType);
            fd.set("entityId", entityId);
            fd.set("body", body);
            start(async () => {
              const res = await addEntityNoteAction(fd);
              if (res.ok) {
                setBody("");
                router.refresh();
              }
            });
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border-2 border-brand-800 bg-brand-700 px-3 text-xs font-bold text-white shadow-sm hover:bg-brand-800 disabled:opacity-60"
        >
          <StickyNote size={12} strokeWidth={2.5} aria-hidden />
          {pending ? "Προσθήκη..." : "Προσθήκη"}
        </button>
      </div>
    </div>
  );
}

export function EntityNoteRow({
  id,
  body,
  author,
  createdAt,
  entityType,
  entityId,
}: {
  id: string;
  body: string;
  author: string;
  createdAt: string;
  entityType: string;
  entityId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <li className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-wrap text-sm text-ink-900">{body}</p>
          <p className="mt-1 text-[11px] text-ink-500">
            {author} · {new Date(createdAt).toLocaleString("el-GR")}
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm("Διαγραφή σημείωσης;")) return;
            const fd = new FormData();
            fd.set("id", id);
            fd.set("entityType", entityType);
            fd.set("entityId", entityId);
            start(async () => {
              await deleteEntityNoteAction(fd);
              router.refresh();
            });
          }}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-red-700 hover:bg-red-100 disabled:opacity-60"
          aria-label="Διαγραφή"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </li>
  );
}
