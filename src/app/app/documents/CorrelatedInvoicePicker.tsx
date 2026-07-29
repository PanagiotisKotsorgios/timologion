"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui/Input";
import { money, date } from "@/lib/format";

export type IssuedDocOption = {
  id: string;
  label: string;      // e.g. "A #123"
  issueDate: string;  // ISO string
  clientName: string; // "—" if no client
  totalAmount: number;
  myDataMark: string; // guaranteed non-null in the parent query
};

/**
 * Parent-invoice picker for 5.1 correlated credit notes. Two mutually
 * exclusive inputs:
 *   1. Dropdown of the tenant's issued docs (max 200, last 12mo, filtered
 *      by client where possible). Server resolves the parent's myDataMark
 *      at issue time.
 *   2. Collapsible manual MARK text field for parents that live outside
 *      timologion (imported ledger, mid-year migration).
 */
export function CorrelatedInvoicePicker({
  options,
  correlatedDocumentId,
  onCorrelatedDocumentIdChange,
  correlatedMarkOverride,
  onCorrelatedMarkOverrideChange,
}: {
  options: IssuedDocOption[];
  correlatedDocumentId: string;
  onCorrelatedDocumentIdChange: (v: string) => void;
  correlatedMarkOverride: string;
  onCorrelatedMarkOverrideChange: (v: string) => void;
}) {
  // Show the manual MARK input by default when there's already an
  // override in state OR when the dropdown has nothing to pick.
  const [manualOpen, setManualOpen] = useState(
    Boolean(correlatedMarkOverride) || options.length === 0,
  );

  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/60 p-5">
      <p className="text-[11px] font-black uppercase tracking-widest text-amber-900/80">
        Συσχετιζόμενο παραστατικό (απαιτείται για 5.1)
      </p>
      <p className="mt-1 text-sm text-amber-900/80">
        Το πιστωτικό αφορά ένα γονικό παραστατικό. Επίλεξέ το από τη
        λίστα ή δώσε το MARK χειροκίνητα.
      </p>

      <div className="mt-4 space-y-3">
        <Field label="Επιλογή από εκδοθέντα" htmlFor="correlated-doc">
          <Select
            id="correlated-doc"
            value={correlatedDocumentId}
            onChange={(e) => {
              onCorrelatedDocumentIdChange(e.target.value);
              if (e.target.value) onCorrelatedMarkOverrideChange("");
            }}
            disabled={options.length === 0}
          >
            <option value="">
              {options.length === 0
                ? "— Δεν υπάρχουν εκδοθέντα παραστατικά —"
                : "— Επιλέξτε παραστατικό —"}
            </option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label} · {date(new Date(o.issueDate))} · {o.clientName} ·{" "}
                {money(o.totalAmount)}
              </option>
            ))}
          </Select>
        </Field>

        <button
          type="button"
          onClick={() => setManualOpen((v) => !v)}
          className="text-sm font-semibold text-amber-900 underline underline-offset-4 hover:text-brand-900"
        >
          {manualOpen ? "Απόκρυψη χειροκίνητης εισαγωγής" : "Ή MARK χειροκίνητα..."}
        </button>

        {manualOpen && (
          <Field
            label="MARK γονικού παραστατικού"
            htmlFor="correlated-mark"
            hint="Χρησιμοποίησέ το μόνο αν το γονικό δεν έχει εκδοθεί μέσα από το timologion."
          >
            <Input
              id="correlated-mark"
              value={correlatedMarkOverride}
              onChange={(e) => {
                onCorrelatedMarkOverrideChange(e.target.value);
                if (e.target.value) onCorrelatedDocumentIdChange("");
              }}
              maxLength={80}
              placeholder="π.χ. 400001234567890"
              className="mono"
            />
          </Field>
        )}
      </div>
    </div>
  );
}
