"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Check, Search, Plus, Minus } from "lucide-react";
import type { DocumentType } from "@prisma/client";
import { Button } from "@/components/ui/Button";

type Option = { value: DocumentType; label: string };

/**
 * Modal that lets the user pick which document types appear in the
 * "Τύπος παραστατικού" dropdown. Split into two clear lists:
 *   • Ενεργοί — the types shown in the dropdown right now
 *   • Διαθέσιμοι — everything else, one click to add
 *
 * Backed by localStorage; changes are staged in `picked` and only
 * committed on Αποθήκευση so the user can cancel out of a mistake.
 */
export function DocTypePickerModal({
  allOptions,
  selected,
  currentType,
  onSaved,
  onClose,
}: {
  allOptions: Option[];
  selected: DocumentType[];
  currentType: DocumentType;
  onSaved: (next: DocumentType[]) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<Set<DocumentType>>(
    () => new Set([...selected, currentType]),
  );
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  function add(v: DocumentType) {
    setPicked((prev) => new Set(prev).add(v));
  }
  function remove(v: DocumentType) {
    if (v === currentType) return; // never remove the currently-active
    setPicked((prev) => {
      const next = new Set(prev);
      next.delete(v);
      return next;
    });
  }

  function save() {
    const arr = Array.from(picked);
    if (!arr.includes(currentType)) arr.push(currentType);
    onSaved(arr);
    onClose();
  }

  const q = query.trim().toLowerCase();
  const matches = (o: Option) => !q || o.label.toLowerCase().includes(q);

  const active = useMemo(
    () => allOptions.filter((o) => picked.has(o.value) && matches(o)),
    [allOptions, picked, q],
  );
  const available = useMemo(
    () => allOptions.filter((o) => !picked.has(o.value) && matches(o)),
    [allOptions, picked, q],
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-type-picker-title"
      className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto p-4 py-8 sm:p-8"
    >
      <button
        type="button"
        aria-label="Κλείσιμο"
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-ink-300/70 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-ink-300/60 px-5 py-4 sm:px-6">
          <h2
            id="doc-type-picker-title"
            className="text-lg font-extrabold text-ink-900 sm:text-xl"
          >
            Διαχείριση τύπων παραστατικών
          </h2>
          <button
            type="button"
            aria-label="Κλείσιμο"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pt-4 sm:px-6">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
              aria-hidden
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Αναζήτηση τύπου"
              className="h-11 w-full rounded-lg border-2 border-ink-300 bg-white pl-9 pr-3 text-base text-ink-900 placeholder:text-ink-500 focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-[58vh] overflow-y-auto px-5 py-4 sm:px-6">
          <section className="mb-5">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-[11px] font-black uppercase tracking-widest text-brand-800">
                Ενεργοί ({picked.size})
              </p>
              <span className="text-xs text-ink-500">
                Εμφανίζονται στο dropdown
              </span>
            </div>
            {active.length === 0 ? (
              <p className="rounded-lg border-2 border-dashed border-ink-300 py-4 text-center text-sm text-ink-500">
                Κανένας ενεργός τύπος.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {active.map((opt) => {
                  const isCurrent = opt.value === currentType;
                  return (
                    <li
                      key={opt.value}
                      className="flex items-center justify-between gap-2 rounded-lg border-2 border-brand-200 bg-brand-50/60 px-3 py-2"
                    >
                      <span className="min-w-0 truncate text-sm font-semibold text-brand-900">
                        {opt.label}
                        {isCurrent && (
                          <span className="ml-2 rounded-full bg-brand-700 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                            Ενεργός
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(opt.value)}
                        disabled={isCurrent}
                        aria-label={`Αφαίρεση ${opt.label}`}
                        title={
                          isCurrent
                            ? "Ο τρέχων επιλεγμένος τύπος δεν μπορεί να αφαιρεθεί"
                            : "Αφαίρεση"
                        }
                        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border-2 border-red-700 bg-red-600 px-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:border-ink-300 disabled:bg-ink-100 disabled:text-ink-500 disabled:shadow-none"
                      >
                        <Minus size={12} strokeWidth={3} aria-hidden />
                        Αφαίρεση
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-[11px] font-black uppercase tracking-widest text-ink-500">
                Διαθέσιμοι ({available.length})
              </p>
              <span className="text-xs text-ink-500">
                Πάτησε «Προσθήκη» για να εμφανιστούν
              </span>
            </div>
            {available.length === 0 ? (
              <p className="rounded-lg border-2 border-dashed border-ink-300 py-4 text-center text-sm text-ink-500">
                {q
                  ? `Δεν βρέθηκε άλλος τύπος για «${query}».`
                  : "Έχουν προστεθεί όλοι οι τύποι."}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {available.map((opt) => (
                  <li
                    key={opt.value}
                    className="flex items-center justify-between gap-2 rounded-lg border border-ink-300 bg-white px-3 py-2"
                  >
                    <span className="min-w-0 truncate text-sm text-ink-800">
                      {opt.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => add(opt.value)}
                      aria-label={`Προσθήκη ${opt.label}`}
                      title="Προσθήκη"
                      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-brand-700 px-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-800"
                    >
                      <Plus size={12} strokeWidth={3} aria-hidden />
                      Προσθήκη
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-ink-300/60 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button type="button" variant="secondary" onClick={onClose}>
            Άκυρο
          </Button>
          <Button type="button" onClick={save} icon={Check}>
            Αποθήκευση
          </Button>
        </div>
      </div>
    </div>
  );
}

function groupByCode(items: Option[]): { label: string; items: Option[] }[] {
  const groups: Record<string, Option[]> = {
    "Τιμολόγια πώλησης (1.x)": [],
    "Τιμολόγια παροχής υπηρεσιών (2.x)": [],
    "Τίτλος κτήσης (3.x)": [],
    "Πιστωτικά (5.x)": [],
    "Αυτοπαράδοση / Ιδιοχρησιμοποίηση (6.x)": [],
    "Συμβόλαια / ενοίκια / ειδικά (7.x - 8.x)": [],
    "Δελτία αποστολής (9.x)": [],
    "Λιανικές αποδείξεις (11.x)": [],
    "Λοιπές εγγραφές τακτοποίησης (17.x)": [],
    "Εσωτερικά — δεν στέλνονται στην ΑΑΔΕ": [],
  };
  const CODE_MAP: Record<string, string> = {
    invoice: "Τιμολόγια πώλησης (1.x)",
    eu_sale_invoice: "Τιμολόγια πώλησης (1.x)",
    third_country_sale_invoice: "Τιμολόγια πώλησης (1.x)",
    third_party_sale_invoice: "Τιμολόγια πώλησης (1.x)",
    third_party_sale_clearing: "Τιμολόγια πώλησης (1.x)",
    complementary_invoice: "Τιμολόγια πώλησης (1.x)",
    service_invoice: "Τιμολόγια παροχής υπηρεσιών (2.x)",
    eu_service_invoice: "Τιμολόγια παροχής υπηρεσιών (2.x)",
    third_country_service_invoice: "Τιμολόγια παροχής υπηρεσιών (2.x)",
    complementary_service_invoice: "Τιμολόγια παροχής υπηρεσιών (2.x)",
    purchase_title: "Τίτλος κτήσης (3.x)",
    purchase_title_refused: "Τίτλος κτήσης (3.x)",
    credit_note: "Πιστωτικά (5.x)",
    credit_note_correlated: "Πιστωτικά (5.x)",
    self_delivery: "Αυτοπαράδοση / Ιδιοχρησιμοποίηση (6.x)",
    self_use: "Αυτοπαράδοση / Ιδιοχρησιμοποίηση (6.x)",
    contract_income: "Συμβόλαια / ενοίκια / ειδικά (7.x - 8.x)",
    rental_income: "Συμβόλαια / ενοίκια / ειδικά (7.x - 8.x)",
    stay_tax_receipt: "Συμβόλαια / ενοίκια / ειδικά (7.x - 8.x)",
    retail_refund_receipt: "Συμβόλαια / ενοίκια / ειδικά (7.x - 8.x)",
    pos_income_receipt: "Συμβόλαια / ενοίκια / ειδικά (7.x - 8.x)",
    pos_payment_receipt: "Συμβόλαια / ενοίκια / ειδικά (7.x - 8.x)",
    delivery_note: "Δελτία αποστολής (9.x)",
    delivery_note_correlated: "Δελτία αποστολής (9.x)",
    retail_receipt: "Λιανικές αποδείξεις (11.x)",
    service_receipt: "Λιανικές αποδείξεις (11.x)",
    simplified_invoice: "Λιανικές αποδείξεις (11.x)",
    retail_credit_note: "Λιανικές αποδείξεις (11.x)",
    third_party_retail_receipt: "Λιανικές αποδείξεις (11.x)",
    income_settlement_accounting: "Λοιπές εγγραφές τακτοποίησης (17.x)",
    income_settlement_tax: "Λοιπές εγγραφές τακτοποίησης (17.x)",
    expense_settlement_accounting: "Λοιπές εγγραφές τακτοποίησης (17.x)",
    expense_settlement_tax: "Λοιπές εγγραφές τακτοποίησης (17.x)",
    payroll_entry: "Λοιπές εγγραφές τακτοποίησης (17.x)",
    depreciation: "Λοιπές εγγραφές τακτοποίησης (17.x)",
    quantitative_receipt: "Εσωτερικά — δεν στέλνονται στην ΑΑΔΕ",
    proforma: "Εσωτερικά — δεν στέλνονται στην ΑΑΔΕ",
    quote: "Εσωτερικά — δεν στέλνονται στην ΑΑΔΕ",
    order: "Εσωτερικά — δεν στέλνονται στην ΑΑΔΕ",
  };
  for (const item of items) {
    const group = CODE_MAP[item.value] ?? "Άλλα";
    (groups[group] ||= []).push(item);
  }
  return Object.entries(groups)
    .filter(([, arr]) => arr.length > 0)
    .map(([label, arr]) => ({ label, items: arr }));
}
