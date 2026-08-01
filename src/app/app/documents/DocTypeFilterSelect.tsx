"use client";

import { useEffect, useState } from "react";
import type { DocumentType } from "@prisma/client";
import { Select } from "@/components/ui/Input";
import { t } from "@/lib/i18n";

/**
 * Type filter for the documents list. Reads the same
 * `timologion.visibleDocTypes` localStorage key that the DraftEditor
 * uses, so the dropdown here matches whatever tier list the user has
 * curated for themselves in the editor's "Διαχείριση τύπων" modal.
 * Falls back to the 6 default types on first load / SSR.
 */

const DEFAULT_VISIBLE: DocumentType[] = [
  "invoice",
  "service_invoice",
  "retail_receipt",
  "service_receipt",
  "credit_note",
  "delivery_note",
];

export function DocTypeFilterSelect({
  currentValue,
}: {
  currentValue: DocumentType | undefined;
}) {
  const [visible, setVisible] = useState<DocumentType[]>(DEFAULT_VISIBLE);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("timologion.visibleDocTypes");
      if (raw) {
        const parsed = JSON.parse(raw) as DocumentType[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVisible(parsed);
        }
      }
    } catch {
      // localStorage disabled — keep defaults.
    }
  }, []);

  // Always include the currently-filtered type even if the user has
  // since removed it from their visible set, so the dropdown reflects
  // the active URL param and doesn't silently reset itself.
  const options = currentValue && !visible.includes(currentValue)
    ? [currentValue, ...visible]
    : visible;

  return (
    <Select id="type" name="type" defaultValue={currentValue ?? ""}>
      <option value="">Όλοι οι τύποι</option>
      {options.map((d) => (
        <option key={d} value={d}>
          {t.documents.types[d]}
        </option>
      ))}
    </Select>
  );
}
