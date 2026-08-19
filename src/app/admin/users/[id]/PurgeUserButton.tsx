"use client";

import { useRef, useState, useTransition } from "react";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { purgeUserAction } from "@/app/admin/actions";

/**
 * Destructive irreversible action — hides behind two confirmations:
 *
 *   1. Click "Οριστική διαγραφή" opens a modal explaining the
 *      consequences (sessions killed, sole-owned businesses wiped,
 *      email freed for re-registration).
 *   2. Modal requires the admin to type the user's email verbatim,
 *      matching Stripe/GitHub's "type name to confirm" pattern.
 *      Prevents accidental clicks + shoulder-surfing.
 *
 * On submit, the server action redirects to /admin/users?purged=1;
 * the modal shows a spinner briefly before that redirect fires.
 */
export function PurgeUserButton({
  userId,
  userEmail,
  hasSoleOwnedBusinesses,
}: {
  userId: string;
  userEmail: string;
  hasSoleOwnedBusinesses: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement | null>(null);

  const confirmed = typed.trim().toLowerCase() === userEmail.toLowerCase();

  return (
    <>
      <Button
        type="button"
        variant="danger"
        icon={Trash2}
        onClick={() => {
          setTyped("");
          setReason("");
          setOpen(true);
        }}
        title="Οριστική διαγραφή χρήστη — απελευθερώνει το email για επανεγγραφή."
      >
        Οριστική διαγραφή
      </Button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) setOpen(false);
          }}
        >
          <form
            ref={formRef}
            action={(fd) => {
              start(async () => {
                await purgeUserAction(fd);
                // action redirects; if it doesn't (e.g. guard hit),
                // close the modal so the admin isn't stuck.
                setOpen(false);
              });
            }}
            className="w-full max-w-lg rounded-2xl border-2 border-red-400 bg-white shadow-2xl"
          >
            <input type="hidden" name="userId" value={userId} />

            <div className="flex items-start justify-between gap-3 rounded-t-2xl border-b-2 border-red-200 bg-red-50 px-6 py-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-red-800">
                  Μη αναστρέψιμη ενέργεια
                </p>
                <h2 className="mt-0.5 text-xl font-extrabold text-red-900">
                  Οριστική διαγραφή χρήστη
                </h2>
              </div>
              <button
                type="button"
                onClick={() => !pending && setOpen(false)}
                aria-label="Κλείσιμο"
                disabled={pending}
                className="grid h-8 w-8 place-items-center rounded-lg text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <p className="text-sm text-ink-800">
                Θα διαγράψεις οριστικά τον χρήστη{" "}
                <strong className="font-mono">{userEmail}</strong>. Αυτό σημαίνει:
              </p>
              <ul className="space-y-1.5 rounded-lg border-2 border-ink-200 bg-ink-50 p-4 text-sm text-ink-800">
                <li>• Όλες οι ενεργές συνεδρίες του χρήστη τερματίζονται.</li>
                <li>• Οι OAuth συνδέσεις του (Google, κλπ) διαγράφονται.</li>
                {hasSoleOwnedBusinesses && (
                  <li className="font-semibold text-red-800">
                    • Οι επιχειρήσεις όπου είναι μόνος του διαγράφονται
                    ΜΑΖΙ ΜΕ όλα τα παραστατικά, πελάτες και είδη τους.
                  </li>
                )}
                <li>
                  • Το email του απελευθερώνεται για επανεγγραφή από
                  τη σελίδα εγγραφής.
                </li>
              </ul>
              <p className="text-sm text-ink-800">
                Καταγράφεται στο <code>accountDeletionLog</code> με snapshot.
              </p>

              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-ink-900">
                  Πληκτρολόγησε το email του χρήστη για επιβεβαίωση
                </span>
                <input
                  type="text"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  disabled={pending}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={userEmail}
                  className="h-11 w-full rounded-lg border-2 border-ink-300 bg-white px-3 font-mono text-sm text-ink-900 focus:border-red-500 focus:outline-none focus:ring-4 focus:ring-red-500/15"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-ink-900">
                  Αιτιολογία (προαιρετικά, καταγράφεται)
                </span>
                <input
                  type="text"
                  name="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={pending}
                  maxLength={255}
                  placeholder="π.χ. αίτημα χρήστη μέσω email, spam λογαριασμός…"
                  className="h-11 w-full rounded-lg border-2 border-ink-300 bg-white px-3 text-sm text-ink-900 focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
                />
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-2 rounded-b-2xl border-t-2 border-ink-200 bg-ink-50 p-4">
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
                disabled={!confirmed || pending}
                className="inline-flex h-11 items-center gap-2 rounded-lg border-2 border-red-700 bg-red-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={14} strokeWidth={2.5} aria-hidden />
                {pending ? "Διαγραφή…" : "Οριστική διαγραφή"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
