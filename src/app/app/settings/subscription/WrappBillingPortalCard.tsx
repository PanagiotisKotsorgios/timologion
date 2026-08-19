"use client";

import { useTransition } from "react";
import { ArrowRight, ExternalLink, Sparkles } from "lucide-react";
import { openWrappBillingPortalAction } from "./actions";

/**
 * Wrapp is the source of truth for billing — plans, upgrades,
 * downgrades, cancellations, invoices, IBAN changes, VAT numbers on
 * receipts — all happen inside the certified provider's own customer
 * portal, not ours. This card is the single entry point from
 * timologion's UI to that portal:
 *
 *   1. Click → calls the server action which does a fresh
 *      external_login for THIS tenant (partner API key + tenant email
 *      → time-limited login_url).
 *   2. Opens the login_url in a new tab so the app session isn't lost.
 *   3. User makes their changes on Wrapp; our nightly reconciler
 *      picks up the new plan / status the next day, and the renewal
 *      cron re-detects the period boundaries automatically.
 *
 * We deliberately don't try to render plan pickers here — showing
 * two sources of truth (ours + Wrapp's) is how tenants end up paying
 * twice.
 */
export function WrappBillingPortalCard({
  hasActiveWrapp,
}: {
  hasActiveWrapp: boolean;
}) {
  const [pending, start] = useTransition();

  function open() {
    start(async () => {
      const res = await openWrappBillingPortalAction();
      if (res.ok) {
        window.open(res.url, "_blank", "noopener,noreferrer");
      } else {
        alert(res.error);
      }
    });
  }

  return (
    <div className="rounded-3xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6 md:p-8">
      <div className="flex flex-wrap items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-900 text-white">
          <Sparkles size={22} strokeWidth={2.5} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-widest text-brand-900/70">
            Διαχείριση πακέτου
          </p>
          <h3 className="mt-1 text-xl font-extrabold text-brand-900 md:text-2xl">
            Αλλαγή πακέτου, χρεώσεις & τιμολόγια
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-black/70">
            Οι πληρωμές και οι αλλαγές πακέτου διαχειρίζονται από τον
            πιστοποιημένο πάροχο ηλεκτρονικής τιμολόγησης{" "}
            <strong>Wrapp</strong>. Κάνε κλικ παρακάτω για να ανοίξεις
            το προφίλ σου στη Wrapp σε νέα καρτέλα — από εκεί μπορείς
            να αναβαθμίσεις πακέτο, να αλλάξεις τρόπο πληρωμής, να
            κατεβάσεις τα τιμολόγια συνδρομής ή να ακυρώσεις.
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-black/75">
            <li>• Αναβάθμιση σε μεγαλύτερο πακέτο (Standard, Business, Pro…)</li>
            <li>• Προσθήκη B2G add-on για παραστατικά προς το δημόσιο</li>
            <li>• Λήψη τιμολογίων συνδρομής</li>
            <li>• Ακύρωση</li>
          </ul>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={open}
          disabled={pending || !hasActiveWrapp}
          className="inline-flex h-12 items-center gap-2 rounded-lg bg-brand-900 px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Άνοιγμα Wrapp…" : "Διαχείριση στη Wrapp"}
          {!pending && (
            <ExternalLink size={14} strokeWidth={2.5} aria-hidden />
          )}
        </button>
        {!hasActiveWrapp && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
            <ArrowRight size={12} aria-hidden />
            Ενεργοποίησε πρώτα τη σύνδεση με τον πάροχο.
          </p>
        )}
      </div>

      <p className="mt-5 border-t-2 border-brand-100 pt-4 text-xs text-black/50">
        Ο συγχρονισμός στοιχείων (νέο πακέτο, ημερομηνία ανανέωσης,
        υπόλοιπο παραστατικών) γίνεται αυτόματα από το nightly job
        μας — αν κάτι δεν ενημερωθεί σε 24 ώρες, επικοινώνησε μαζί μας.
      </p>
    </div>
  );
}
