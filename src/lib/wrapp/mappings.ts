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
    case "simplified_invoice":
      return "11.3"; // Απλοποιημένο Τιμολόγιο
    case "eu_sale_invoice":
      return "1.2"; // Τιμολόγιο Πώλησης / Ενδοκοινοτικές Παραδόσεις
    case "third_country_sale_invoice":
      return "1.3"; // Τιμολόγιο Πώλησης / Παραδόσεις Τρίτων Χωρών
    case "eu_service_invoice":
      return "2.2"; // Τιμολόγιο Παροχής / Ενδοκοινοτική Παροχή Υπηρεσιών
    case "third_country_service_invoice":
      return "2.3"; // Τιμολόγιο Παροχής / Παροχή Υπηρεσιών Τρίτων Χωρών
    case "credit_note":
      // Non-correlated credit note. Standalone — no parent MARK.
      return "5.2";
    case "credit_note_correlated":
      // Correlated credit note. Wrapp requires the parent's myDATA MARK
      // in `correlated_invoices`; attemptIssueAction refuses to submit
      // without one.
      return "5.1";
    case "delivery_note":
      return "9.3"; // Δελτίο Αποστολής
    case "stay_tax_receipt":
      // Ειδικό Στοιχείο – Απόδειξης Είσπραξης Φόρου Διαμονής. Requires
      // stay-tax category + amount fields and a correlated parent MARK.
      return "8.2";
    case "third_party_sale_invoice":
      return "1.4"; // Πώληση για Λ/σμο Τρίτων
    case "third_party_sale_clearing":
      return "1.5"; // Εκκαθάριση Πωλήσεων Τρίτων
    case "complementary_invoice":
      // Συμπληρωματικό Παραστατικό — requires correlated parent MARK.
      return "1.6";
    case "complementary_service_invoice":
      // Συμπληρωματικό Παροχής — requires correlated parent MARK.
      return "2.4";
    case "purchase_title":
      return "3.1"; // Τίτλος Κτήσης (μη υπόχρεος Εκδότης)
    case "purchase_title_refused":
      return "3.2"; // Τίτλος Κτήσης (άρνηση έκδοσης)
    case "self_delivery":
      return "6.1"; // Στοιχεία Αυτοπαράδοσης
    case "self_use":
      return "6.2"; // Στοιχεία Ιδιοχρησιμοποίησης
    case "contract_income":
      return "7.1"; // Συμβόλαιο - Έσοδο
    case "rental_income":
      return "8.1"; // Ενοίκια - Έσοδο
    case "retail_refund_receipt":
      // Απόδειξη Επιστροφής — requires correlated parent MARK.
      return "8.4";
    case "pos_income_receipt":
      return "8.5"; // Απόδειξη Είσπραξης POS
    case "pos_payment_receipt":
      return "8.6"; // Απόδειξη Πληρωμής POS
    case "retail_credit_note":
      // Πιστωτικό Στοιχείο Λιανικής — requires correlated parent MARK.
      return "11.4";
    case "third_party_retail_receipt":
      return "11.5"; // Απόδειξη Λιανικής Πώλησης για Λ/σμο Τρίτων
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
  // EU intra-community sales/services — myDATA classifies these under
  // category1_3 with type E3_561_002 (Πωλήσεις χονδρικές - επιτηδευματιών,
  // ενδοκοινοτικές).
  if (type === "eu_sale_invoice" || type === "eu_service_invoice")
    return { category: "category1_3", type: "E3_561_002" };
  // Third-country sales/services — E3_561_005 (Πωλήσεις χονδρικές -
  // επιτηδευματιών, τρίτες χώρες).
  if (
    type === "third_country_sale_invoice" ||
    type === "third_country_service_invoice"
  )
    return { category: "category1_3", type: "E3_561_005" };
  // Stay-tax receipts fall under special taxes.
  if (type === "stay_tax_receipt")
    return { category: "category1_5", type: "E3_596" };
  // Third-party sales / clearings (invoice-on-behalf-of). myDATA reuses
  // the retail wholesale bucket with the "τρίτων" sub-code E3_561_007.
  if (
    type === "third_party_sale_invoice" ||
    type === "third_party_sale_clearing" ||
    type === "third_party_retail_receipt"
  )
    return { category: "category1_3", type: "E3_561_007" };
  // Rental income → other income bucket, real-estate rental type.
  if (type === "rental_income")
    return { category: "category1_2", type: "E3_881_003" };
  // Contract income (deed / συμβόλαιο) → other income, contracts.
  if (type === "contract_income")
    return { category: "category1_2", type: "E3_881_001" };
  // Purchase titles are issued BY the buyer FOR a non-obligated seller —
  // in our sales-side flow we treat these as B2B invoices for
  // classification purposes and let the accountant adjust downstream.
  if (type === "purchase_title" || type === "purchase_title_refused")
    return { category: "category1_3", type: "E3_561_001" };
  // Self-delivery / self-use are accounting adjustments — classified
  // with wholesale to keep the totals consistent with the source
  // inventory movement.
  if (type === "self_delivery" || type === "self_use")
    return { category: "category1_3", type: "E3_561_001" };
  // Retail refund + retail credit + POS receipts all follow retail flow.
  if (
    type === "retail_refund_receipt" ||
    type === "retail_credit_note" ||
    type === "pos_income_receipt" ||
    type === "pos_payment_receipt"
  )
    return { category: "category1_3", type: "E3_561_003" };
  // Complementary invoices inherit the classification of the parent
  // invoice — the safe default is wholesale.
  if (
    type === "complementary_invoice" ||
    type === "complementary_service_invoice"
  )
    return { category: "category1_3", type: "E3_561_001" };
  if (
    type === "invoice" ||
    type === "service_invoice" ||
    type === "credit_note" ||
    type === "credit_note_correlated"
  )
    return { category: "category1_3", type: "E3_561_001" };
  if (
    type === "retail_receipt" ||
    type === "service_receipt" ||
    type === "simplified_invoice"
  )
    return { category: "category1_3", type: "E3_561_003" };
  return { category: "category1_3", type: "E3_561_001" };
}
