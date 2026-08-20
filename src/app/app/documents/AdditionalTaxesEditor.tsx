"use client";

import { useMemo } from "react";
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
 * myDATA / Wrapp "OtherTaxesCategory" codes (see AADE myDATA spec).
 * Kept as (value, label) so the payload sends the correct integer code
 * once the backend plumbs this into the Wrapp `other_taxes` array.
 */
const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "— Επιλογή κατηγορίας —" },
  { value: "1", label: "1 · Τέλος συνδρομητών κινητής τηλεφωνίας" },
  { value: "2", label: "2 · Τέλος συνδρομητών σταθερής τηλεφωνίας" },
  { value: "3", label: "3 · Τέλος συνδρομητικής τηλεόρασης" },
  { value: "4", label: "4 · Εισφορά ΕΡΤ" },
  { value: "5", label: "5 · Τέλος διανυκτέρευσης (φόρος διαμονής)" },
  { value: "6", label: "6 · Ειδικός φόρος κατανάλωσης" },
  { value: "7", label: "7 · Τέλη χαρτοσήμου" },
  { value: "8", label: "8 · Ειδικός φόρος πολυτελείας" },
  { value: "9", label: "9 · Λοιπά τέλη" },
  { value: "10", label: "10 · Παρακράτηση φόρου εισοδήματος" },
  { value: "11", label: "11 · Παρακράτηση ειδικής εισφοράς αλληλεγγύης" },
  { value: "12", label: "12 · ΟΓΑ χαρτοσήμου" },
  { value: "13", label: "13 · Λοιποί φόροι" },
  { value: "14", label: "14 · Κρατήσεις" },
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

/** Serialize rows + optional legacy text back to the string column. */
export function serializeAdditionalTaxes(
  rows: AdditionalTaxRow[],
  legacyText: string,
): string {
  const cleanRows = rows.filter(
    (r) => r.category || r.label || r.amount.trim(),
  );
  if (cleanRows.length === 0 && !legacyText.trim()) return "";
  return JSON.stringify({ rows: cleanRows, legacyText: legacyText.trim() });
}

export function AdditionalTaxesEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const { rows, legacyText } = useMemo(() => parseAdditionalTaxes(value), [
    value,
  ]);

  function updateRow(i: number, patch: Partial<AdditionalTaxRow>) {
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    onChange(serializeAdditionalTaxes(next, legacyText));
  }

  function removeRow(i: number) {
    const next = rows.filter((_, idx) => idx !== i);
    onChange(serializeAdditionalTaxes(next, legacyText));
  }

  function addRow() {
    const next = [
      ...rows,
      { category: "", label: "", amount: "" } as AdditionalTaxRow,
    ];
    onChange(serializeAdditionalTaxes(next, legacyText));
  }

  function updateLegacy(next: string) {
    onChange(serializeAdditionalTaxes(rows, next));
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
                      {CATEGORY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
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
