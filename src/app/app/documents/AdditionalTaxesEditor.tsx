"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";

/**
 * Structured editor for the "Επιπλέον φόροι" block.
 *
 * Previously this field was a free-text textarea — users typed anything
 * ("π.χ. Παρακράτηση φόρου 20% : -100,00") which the myDATA/Wrapp
 * validator obviously could not consume, so the tax amounts never
 * reached the AADE payload and stay-tax receipts (8.2) failed with
 * "OtherTaxesPercentCategory is mandatory".
 *
 * The editor stores an array of rows and serializes it to JSON in the
 * hidden textarea the parent form still reads (`additionalTaxes`
 * column, unchanged). The parent stays a plain form field — no props
 * plumbing needed. Legacy plain-text values are preserved verbatim in
 * a fallback textarea below the structured rows so no history is lost.
 */

export type AdditionalTaxRow = {
  category: string;
  label: string;
  amount: string;
};

/**
 * myDATA / Wrapp `other_taxes_percent_category` codes — EXACT match
 * to the Wrapp API doc table so the value sent on the wire is what
 * the AADE validator expects. Grouped optgroups keep the seasonal
 * accommodation-tax variants readable (Wrapp uses different codes
 * for high/low season and per star rating).
 */
type CategoryOption = { value: string; label: string; group: string };
const CATEGORY_OPTIONS: CategoryOption[] = [
  // Ασφάλιστρα
  { value: "3", label: "3 · Ασφάλιστρα κλάδου ζωής 4%", group: "Ασφάλιστρα" },
  { value: "4", label: "4 · Ασφάλιστρα λοιπών κλάδων 15%", group: "Ασφάλιστρα" },
  { value: "5", label: "5 · Απαλλασσόμενα φόρου ασφαλίστρων 0%", group: "Ασφάλιστρα" },
  { value: "15", label: "15 · Ασφάλιστρα κλάδου πυρός 20%", group: "Ασφάλιστρα" },
  // Τέλος ανθεκτικότητας — Χαμηλή περίοδος (Νοέμβριος-Μάρτιος)
  { value: "6", label: "6 · Ξενοδοχεία 1-2 αστέρων — 0,50€", group: "Τέλος διαμονής (χαμηλή, Νοε-Μαρ)" },
  { value: "7", label: "7 · Ξενοδοχεία 3 αστέρων — 1,50€", group: "Τέλος διαμονής (χαμηλή, Νοε-Μαρ)" },
  { value: "8", label: "8 · Ξενοδοχεία 4 αστέρων — 3,00€", group: "Τέλος διαμονής (χαμηλή, Νοε-Μαρ)" },
  { value: "9", label: "9 · Ξενοδοχεία 5 αστέρων — 4,00€", group: "Τέλος διαμονής (χαμηλή, Νοε-Μαρ)" },
  { value: "10", label: "10 · Ενοικιαζόμενα δωμάτια/διαμερίσματα — 0,50€", group: "Τέλος διαμονής (χαμηλή, Νοε-Μαρ)" },
  { value: "28", label: "28 · Βραχυχρόνια μίσθωση έως 80τ.μ. — 2,00€", group: "Τέλος διαμονής (χαμηλή, Νοε-Μαρ)" },
  { value: "29", label: "29 · Βραχυχρόνια μίσθωση >80τ.μ. — 4,00€", group: "Τέλος διαμονής (χαμηλή, Νοε-Μαρ)" },
  { value: "30", label: "30 · Αυτοεξυπηρετούμενα / Βίλες — 4,00€", group: "Τέλος διαμονής (χαμηλή, Νοε-Μαρ)" },
  // Τέλος ανθεκτικότητας — Υψηλή περίοδος (Απρίλιος-Οκτώβριος)
  { value: "20", label: "20 · Ξενοδοχεία 1-2 αστέρων — 2,00€", group: "Τέλος διαμονής (υψηλή, Απρ-Οκτ)" },
  { value: "21", label: "21 · Ξενοδοχεία 3 αστέρων — 5,00€", group: "Τέλος διαμονής (υψηλή, Απρ-Οκτ)" },
  { value: "22", label: "22 · Ξενοδοχεία 4 αστέρων — 10,00€", group: "Τέλος διαμονής (υψηλή, Απρ-Οκτ)" },
  { value: "23", label: "23 · Ξενοδοχεία 5 αστέρων — 15,00€", group: "Τέλος διαμονής (υψηλή, Απρ-Οκτ)" },
  { value: "24", label: "24 · Ενοικιαζόμενα δωμάτια/διαμερίσματα — 2,00€", group: "Τέλος διαμονής (υψηλή, Απρ-Οκτ)" },
  { value: "25", label: "25 · Βραχυχρόνια μίσθωση έως 80τ.μ. — 8,00€", group: "Τέλος διαμονής (υψηλή, Απρ-Οκτ)" },
  { value: "26", label: "26 · Βραχυχρόνια μίσθωση >80τ.μ. — 15,00€", group: "Τέλος διαμονής (υψηλή, Απρ-Οκτ)" },
  { value: "27", label: "27 · Αυτοεξυπηρετούμενα / Βίλες — 15,00€", group: "Τέλος διαμονής (υψηλή, Απρ-Οκτ)" },
  // Λοιπά
  { value: "11", label: "11 · Ειδικός Φόρος Τηλεοπτικών Διαφημίσεων 5%", group: "Λοιπά" },
  { value: "12", label: "12 · Φόρος πολυτελείας (ενδοκοιν./εισαγωγή) 10%", group: "Λοιπά" },
  { value: "13", label: "13 · Φόρος πολυτελείας (εγχώρια παραγωγή) 10%", group: "Λοιπά" },
  { value: "14", label: "14 · Δικαίωμα Δημοσίου καζίνο 80%", group: "Λοιπά" },
  { value: "16", label: "16 · Λοιποί Τελωνειακοί Δασμοί/Φόροι", group: "Λοιπά" },
  { value: "17", label: "17 · Λοιποί Φόροι", group: "Λοιπά" },
  { value: "18", label: "18 · Επιβαρύνσεις Λοιπών Φόρων", group: "Λοιπά" },
  { value: "19", label: "19 · ΕΦΚ (Ειδικός Φόρος Κατανάλωσης)", group: "Λοιπά" },
];
const CATEGORY_GROUPS: readonly string[] = [
  "Ασφάλιστρα",
  "Τέλος διαμονής (χαμηλή, Νοε-Μαρ)",
  "Τέλος διαμονής (υψηλή, Απρ-Οκτ)",
  "Λοιπά",
];

/**
 * Parse the stored value. Structured JSON round-trips back to rows;
 * anything else (empty or legacy free-text) becomes an empty grid and
 * the free-text carries over into `legacyText` for display.
 */
export function parseAdditionalTaxes(raw: string | null | undefined): {
  rows: AdditionalTaxRow[];
  legacyText: string;
} {
  const s = (raw ?? "").trim();
  if (!s) return { rows: [], legacyText: "" };
  try {
    const parsed = JSON.parse(s);
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as { rows?: unknown }).rows)
    ) {
      const rowsUnknown = (parsed as { rows: unknown[] }).rows;
      const rows = rowsUnknown
        .map((r) => {
          if (!r || typeof r !== "object") return null;
          const rr = r as Record<string, unknown>;
          return {
            category: String(rr.category ?? ""),
            label: String(rr.label ?? ""),
            amount: String(rr.amount ?? ""),
          };
        })
        .filter((r): r is AdditionalTaxRow => r !== null);
      const legacyText = String(
        (parsed as { legacyText?: unknown }).legacyText ?? "",
      );
      return { rows, legacyText };
    }
  } catch {
    // Fall through — legacy free-text.
  }
  return { rows: [], legacyText: s };
}

/**
 * Serialize rows + optional legacy text back to the string column.
 * Preserves EMPTY rows on purpose — the parent needs to see them so
 * they survive re-renders during editing. The backend (payload
 * builder + preflight guard) is where empty rows get filtered out
 * before hitting Wrapp.
 */
export function serializeAdditionalTaxes(
  rows: AdditionalTaxRow[],
  legacyText: string,
): string {
  if (rows.length === 0 && !legacyText.trim()) return "";
  return JSON.stringify({ rows, legacyText: legacyText.trim() });
}

export function AdditionalTaxesEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  // Component owns the row array locally so an empty "Προσθήκη
  // γραμμής" row survives the round-trip (serialize -> parent state
  // -> parse). Previous version filtered empty rows on serialize,
  // which stripped the freshly-added row immediately and made the
  // "Add" button appear broken.
  const initial = useMemo(() => parseAdditionalTaxes(value), [value]);
  const [rows, setRows] = useState<AdditionalTaxRow[]>(initial.rows);
  const [legacyText, setLegacyText] = useState<string>(initial.legacyText);

  // Keep local state in sync when the parent form resets `value`
  // (e.g. cancel + reopen with a different document). Ignored when
  // the parent is just echoing back our own serialize output.
  useEffect(() => {
    const echo = serializeAdditionalTaxes(rows, legacyText);
    if (echo !== value) {
      const parsed = parseAdditionalTaxes(value);
      setRows(parsed.rows);
      setLegacyText(parsed.legacyText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function push(next: AdditionalTaxRow[], legacy: string) {
    setRows(next);
    setLegacyText(legacy);
    onChange(serializeAdditionalTaxes(next, legacy));
  }

  function updateRow(i: number, patch: Partial<AdditionalTaxRow>) {
    push(
      rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
      legacyText,
    );
  }

  function removeRow(i: number) {
    push(rows.filter((_, idx) => idx !== i), legacyText);
  }

  function addRow() {
    push(
      [...rows, { category: "", label: "", amount: "" } as AdditionalTaxRow],
      legacyText,
    );
  }

  function updateLegacy(next: string) {
    push(rows, next);
  }

  const total = rows.reduce((acc, r) => {
    const n = Number(String(r.amount).replace(",", "."));
    return Number.isFinite(n) ? acc + n : acc;
  }, 0);

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-600">
        Παρακράτηση, χαρτόσημο, τέλη διαμονής, ΟΓΑ κ.ά. Επίλεξε κατηγορία
        για να αναγνωριστεί από το myDATA — μη χρησιμοποιείς ελεύθερο
        κείμενο, δεν διαβιβάζεται σωστά.
      </p>

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border-2 border-ink-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-ink-100 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-3 py-2 text-left">Κατηγορία φόρου</th>
                <th className="px-3 py-2 text-left">Περιγραφή</th>
                <th className="w-36 px-3 py-2 text-right">Ποσό (€)</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-2 py-2">
                    <Select
                      value={r.category}
                      onChange={(e) =>
                        updateRow(i, { category: e.target.value })
                      }
                    >
                      <option value="">— Επιλογή κατηγορίας —</option>
                      {CATEGORY_GROUPS.map((group) => (
                        <optgroup key={group} label={group}>
                          {CATEGORY_OPTIONS.filter(
                            (o) => o.group === group,
                          ).map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </Select>
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      value={r.label}
                      onChange={(e) =>
                        updateRow(i, { label: e.target.value })
                      }
                      placeholder="π.χ. Παρακράτηση 20%"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      step="0.01"
                      className="text-right tabular-nums"
                      value={r.amount}
                      onChange={(e) =>
                        updateRow(i, { amount: e.target.value })
                      }
                      placeholder="0,00"
                    />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      onClick={() => removeRow(i)}
                    >
                      <span className="sr-only">Διαγραφή γραμμής</span>
                    </Button>
                  </td>
                </tr>
              ))}
              <tr className="bg-brand-50/40">
                <td colSpan={2} className="px-3 py-2 text-right text-xs font-black uppercase tracking-widest text-brand-900/70">
                  Σύνολο επιπλέον φόρων
                </td>
                <td className="px-3 py-2 text-right font-mono text-sm font-bold tabular-nums text-brand-900">
                  {total.toLocaleString("el-GR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        icon={Plus}
        onClick={addRow}
      >
        {rows.length === 0 ? "Προσθήκη επιπλέον φόρου" : "Προσθήκη γραμμής"}
      </Button>

      {/* Legacy free-text pass-through — visible ONLY if the doc was
          saved before the structured editor existed. Preserves history
          so nothing is lost during the transition. */}
      {legacyText && (
        <div className="mt-3 rounded-lg border-2 border-amber-300 bg-amber-50 p-3 text-xs">
          <p className="mb-1 font-black uppercase tracking-widest text-amber-900">
            Παλιά ελεύθερη σημείωση
          </p>
          <textarea
            className="w-full resize-y rounded border border-amber-300 bg-white p-2 text-sm text-ink-900"
            rows={2}
            value={legacyText}
            onChange={(e) => updateLegacy(e.target.value)}
          />
          <p className="mt-1 text-amber-900">
            Συνιστάται να μεταφέρεις αυτές τις εγγραφές σε δομημένες
            γραμμές παραπάνω και μετά να αφαιρέσεις αυτό το κείμενο.
          </p>
        </div>
      )}
    </div>
  );
}
