import "server-only";
import type { DocumentType, PaymentMethod } from "@prisma/client";

/**
 * Map our internal DocumentType enum to the myDATA / Wrapp `invoice_type_code`.
 *
 * See https://wrapp.ai/api/documentation.md — "Είδη Παραστατικών".
 *
 * Types we don't have a direct Wrapp mapping for (proforma, quote, order) are
 * kept as internal drafts only and never sent to Wrapp.
 */
export function mapDocumentTypeToWrapp(type: DocumentType): string | null {
  switch (type) {
    case "invoice":
      return "1.1"; // Τιμολόγιο Πώλησης
    case "service_invoice":
      return "2.1"; // Τιμολόγιο Παροχής Υπηρεσιών
    case "retail_receipt":
      return "11.1"; // Απόδειξη Λιανικής Πώλησης
    case "service_receipt":
      return "11.2"; // Απόδειξη Παροχής Υπηρεσιών
    case "credit_note":
      // Non-correlated credit note. Correlated (5.1) would require the
      // parent's myDATA MARK in `correlated_invoices`, which we don't
      // always have — 5.2 is standalone and works everywhere.
      return "5.2";
    case "delivery_note":
      return "9.3"; // Δελτίο Αποστολής
    case "proforma":
    case "quote":
    case "order":
      return null; // internal-only
    default:
      return null;
  }
}

/**
 * Map our PaymentMethod to Wrapp's `payment_method_type` integer.
 * 0=Cash 1=Credit 2=Local bank 3=Card 4=Cheque 5=Overseas bank 6=Web banking 7=IRIS
 *
 * `Document.paymentMethod` is stored as the free-form Greek label the user
 * picked from the dropdown (there's no enum coercion on the column), so we
 * normalize BOTH the English enum values and the Greek labels here. The
 * old code casted `paymentMethod` to `PaymentMethod` at the call site, which
 * silently missed every real value and fell through to the default.
 */
export function mapPaymentMethodToWrapp(
  m: PaymentMethod | string | null | undefined,
): number {
  if (!m) return 0;
  const raw = String(m).trim().toLowerCase();
  // English enum values
  if (raw === "cash" || raw === "μετρητά" || raw === "μετρητα") return 0;
  if (raw === "credit" || raw.includes("πιστώσει") || raw.includes("πιστωσει")) return 1;
  if (
    raw === "bank_transfer" ||
    raw.includes("τραπεζ") ||
    raw.includes("μεταφορ")
  ) {
    return 2;
  }
  if (raw === "card" || raw.includes("κάρτα") || raw.includes("καρτα")) return 3;
  if (raw === "check" || raw.includes("επιταγ")) return 4;
  if (raw === "iris") return 7;
  return 0;
}

/**
 * Default myDATA classification per document type.
 *
 * For B2B invoices (1.x, 2.x) the safe fallback is:
 *   category = "category1_3"  (Έσοδα από παροχή υπηρεσιών)
 *   type     = "E3_561_001"   (Πωλήσεις χονδρικές - επιτηδευματιών)
 *
 * For B2C receipts (11.x):
 *   category = "category1_3"
 *   type     = "E3_561_003"   (Πωλήσεις λιανικές - ιδιωτική πελατεία)
 *
 * For delivery notes (9.3) the required combo per Wrapp docs is:
 *   category = "category3"
 *   type     = "_"
 */
export function classificationFor(type: DocumentType): {
  category: string;
  type: string;
} {
  if (type === "delivery_note")
    return { category: "category3", type: "_" };
  if (type === "invoice" || type === "service_invoice" || type === "credit_note")
    return { category: "category1_3", type: "E3_561_001" };
  if (type === "retail_receipt" || type === "service_receipt")
    return { category: "category1_3", type: "E3_561_003" };
  return { category: "category1_3", type: "E3_561_001" };
}
