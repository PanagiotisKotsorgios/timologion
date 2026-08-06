"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Mail, Send, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { sendDocumentEmailAction } from "../actions";

/**
 * Send-invoice-by-email button + popup. Replaces the naive mailto: link
 * that used to sit on the doc detail page — that just opened whatever
 * mail client the browser was configured for and had no idea about the
 * doc itself. This one collects a recipient email + optional message
 * and pushes the send through our own Brevo pipeline so we can track
 * delivery, style the email, and default to the client's on-file email
 * without the user having to look it up.
 */
export function SendEmailButton({
  documentId,
  defaultRecipient,
  defaultClientName,
}: {
  documentId: string;
  defaultRecipient?: string | null;
  defaultClientName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState(defaultRecipient ?? "");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // Reset recipient/message when the modal opens so re-opens don't
    // silently carry stale state (e.g. after a successful send).
    setRecipient(defaultRecipient ?? "");
    setMessage("");
    // Focus after paint so the browser doesn't scroll the page.
    const timer = setTimeout(() => firstInputRef.current?.focus(), 0);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, defaultRecipient]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const trimmed = recipient.trim();
    if (!trimmed || !/^\S+@\S+\.\S+$/.test(trimmed)) {
      toast.error("Δώσε έγκυρη διεύθυνση email.");
      return;
    }
    start(async () => {
      const res = await sendDocumentEmailAction({
        documentId,
        recipientEmail: trimmed,
        message: message.trim() || undefined,
      });
      if (res.ok) {
        toast.success(`Το email εστάλη στο ${trimmed}.`);
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-lg border-2 border-cyan-700 bg-cyan-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-cyan-700 sm:h-11 sm:text-base"
      >
        <Mail size={16} strokeWidth={2.5} aria-hidden />
        Αποστολή Email
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="send-email-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            className="w-full max-w-md rounded-2xl border-2 border-ink-300 bg-white shadow-2xl"
          >
            <form onSubmit={handleSubmit}>
              <div className="flex items-start justify-between gap-3 border-b-2 border-ink-200 p-5">
                <div>
                  <h2
                    id="send-email-title"
                    className="text-lg font-black text-ink-900"
                  >
                    Αποστολή παραστατικού με email
                  </h2>
                  <p className="mt-1 text-sm text-ink-700">
                    Θα σταλεί σύνδεσμος + PDF στη διεύθυνση που θα δώσεις.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Κλείσιμο"
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 p-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-ink-900">
                    Παραλήπτης <span className="text-red-600">*</span>
                  </span>
                  <input
                    ref={firstInputRef}
                    type="email"
                    inputMode="email"
                    required
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="name@example.com"
                    className="h-12 w-full rounded-lg border-2 border-ink-300 bg-white px-4 text-base text-ink-900 placeholder:text-ink-500 hover:border-ink-500 focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
                  />
                  {defaultRecipient && (
                    <p className="mt-1.5 text-xs text-ink-500">
                      Προεπιλογή: το email του πελάτη
                      {defaultClientName ? ` (${defaultClientName})` : ""}.
                      Άλλαξέ το αν χρειάζεται.
                    </p>
                  )}
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-ink-900">
                    Προαιρετικό μήνυμα
                  </span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={2000}
                    rows={4}
                    placeholder="Π.χ. Καλησπέρα, σας στέλνω το τιμολόγιο για τον μήνα..."
                    className="w-full rounded-lg border-2 border-ink-300 bg-white px-4 py-3 text-base text-ink-900 placeholder:text-ink-500 hover:border-ink-500 focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
                  />
                </label>
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t-2 border-ink-200 bg-ink-50 p-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="inline-flex h-11 items-center rounded-lg border-2 border-ink-300 bg-white px-4 text-sm font-bold text-ink-800 shadow-sm hover:bg-ink-100 disabled:opacity-60"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border-2 border-brand-800 bg-brand-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-brand-800 disabled:opacity-60"
                >
                  <Send size={16} strokeWidth={2.5} aria-hidden />
                  {pending ? "Αποστολή..." : "Αποστολή"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
