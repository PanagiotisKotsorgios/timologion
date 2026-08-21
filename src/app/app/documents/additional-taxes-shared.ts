/**
 * Pure helpers for the structured "Επιπλέον φόροι" column.
 *
 * Split out from AdditionalTaxesEditor.tsx (which is "use client")
 * so Server Components — the document detail page renderer — can
 * call parseAdditionalTaxes without dragging the client component
 * boundary into the RSC compilation. Symmetric serializer kept here
 * too for callers that want to round-trip on the server (e.g.
 * migrations, admin tooling).
 */

export type AdditionalTaxRow = {
  category: string;
  label: string;
  amount: string;
};

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
 * Preserves EMPTY rows on purpose — the client editor needs them to
 * survive re-renders during editing. Consumers that want to skip
 * empties should filter after parsing.
 */
export function serializeAdditionalTaxes(
  rows: AdditionalTaxRow[],
  legacyText: string,
): string {
  if (rows.length === 0 && !legacyText.trim()) return "";
  return JSON.stringify({ rows, legacyText: legacyText.trim() });
}
