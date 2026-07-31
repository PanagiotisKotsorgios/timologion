"use client";

import { useEffect, useMemo, useState } from "react";
import { X, ListPlus, Check, Search } from "lucide-react";
import type { DocumentType } from "@prisma/client";
import { Button } from "@/components/ui/Button";

type Option = { value: DocumentType; label: string };

/**
 * Modal that lets the user pick which document types appear in the
 * "Τύπος παραστατικού" dropdown. Backed by localStorage so the choice
 * is instant and per-browser. Search field on top so 31 types stay
 * scannable; groups by myDATA code range (1.x / 2.x / 5.x / etc.).
 *
 * The parent (DraftEditor) reads the same localStorage key on mount
 * and re-reads whenever this modal closes with a save.
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

  function toggle(v: DocumentType) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  }

  function save() {
    // Always keep the currently-selected type in the visible list so
    // the dropdown doesn't disappear from under the user.
    const arr = Array.from(picked);
    if (!arr.includes(currentType)) arr.push(currentType);
    onSaved(arr);
    onClose();
  }

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return allOptions;
    return allOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [allOptions, q]);

  const groups = useMemo(() => groupByCode(filtered), [filtered]);

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
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-ink-300/70 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-ink-300/60 px-6 py-5 sm:px-8">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-800">
              <ListPlus size={20} aria-hidden />
            </div>
            <div className="min-w-0">
              <h2
                id="doc-type-picker-title"
                className="text-xl font-extrabold text-brand-900 sm:text-2xl"
              >
                Διαχείριση τύπων παραστατικών
              </h2>
              <p className="mt-1 text-sm text-ink-700">
                Επίλεξε ποιοι τύποι θα εμφανίζονται στο dropdown σου.
                Επιλεγμένοι τώρα: <strong>{picked.size}</strong> από{" "}
                {allOptions.length}.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Κλείσιμο"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pt-5 sm:px-8">
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
              placeholder="Αναζήτηση τύπου (π.χ. τιμολόγιο, 5.1, φόρος)"
              className="h-11 w-full rounded-lg border-2 border-ink-300 bg-white pl-9 pr-3 text-base text-ink-900 placeholder:text-ink-500 focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-[52vh] overflow-y-auto px-6 py-4 sm:px-8">
          {groups.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-500">
              Δεν βρέθηκε τύπος για «{query}».
            </p>
          ) : (
            <div className="space-y-5">
              {groups.map((g) => (
                <div key={g.label}>
                  <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-ink-500">
                    {g.label}
                  </p>
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {g.items.map((opt) => {
                      const on = picked.has(opt.value);
                      const isCurrent = opt.value === currentType;
                      return (
                        <li key={opt.value}>
                          <button
                            type="button"
                            onClick={() => toggle(opt.value)}
                            disabled={isCurrent && on}
                            title={
                              isCurrent && on
                                ? "Ο τρέχων επιλεγμένος τύπος δεν μπορεί να αφαιρεθεί"
                                : undefined
                            }
                            className={`flex w-full items-center justify-between gap-2 rounded-lg border-2 px-3 py-2 text-left text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
                              on
                                ? "border-brand-700 bg-brand-50 text-brand-900"
                                : "border-ink-300 bg-white text-ink-700 hover:border-ink-500"
                            }`}
                          >
                            <span className="min-w-0 truncate">{opt.label}</span>
                            {on && (
                              <Check
                                size={16}
                                strokeWidth={2.5}
                                className="shrink-0 text-brand-700"
                                aria-hidden
                              />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-ink-300/60 px-6 py-4 sm:flex-row sm:justify-between sm:px-8">
          <button
            type="button"
            onClick={() => setPicked(new Set([currentType]))}
            className="text-sm font-semibold text-ink-700 hover:text-ink-900"
          >
            Καθαρισμός · μόνο ο τρέχων
          </button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={onClose}>
              Άκυρο
            </Button>
            <Button type="button" onClick={save} icon={Check}>
              Αποθήκευση επιλογών
            </Button>
          </div>
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
    retail_receipt: "Λιανικές αποδείξεις (11.x)",
    service_receipt: "Λιανικές αποδείξεις (11.x)",
    simplified_invoice: "Λιανικές αποδείξεις (11.x)",
    retail_credit_note: "Λιανικές αποδείξεις (11.x)",
    third_party_retail_receipt: "Λιανικές αποδείξεις (11.x)",
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
