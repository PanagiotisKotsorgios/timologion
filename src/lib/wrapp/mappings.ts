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
    case "delivery_note_correlated":
      // Same wire code as 9.3 — correlation happens through the
      // correlated_invoices array on the payload. The type is separate
      // so we can enforce a mandatory parent MARK in attemptIssueAction.
      return "9.3";
    // ─── myDATA 17.x settlement entries ─────────────────────────────
    // Per Wrapp/AADE docs the codes are:
    //   17.1 = Μισθοδοσία
    //   17.2 = Αποσβέσεις
    //   17.3 = Λοιπές Τακτοποίησης Εσόδων / Λογιστική Βάση
    //   17.4 = Λοιπές Τακτοποίησης Εσόδων / Φορολογική Βάση
    //   17.5 = Λοιπές Τακτοποίησης Εξόδων / Λογιστική Βάση
    //   17.6 = Λοιπές Τακτοποίησης Εξόδων / Φορολογική Βάση
    // Our DocumentType names are what we picked on our side — the
    // *values* used to be swapped against the Wrapp codes; this
    // corrects them.
    case "payroll_entry":
      return "17.1"; // Μισθοδοσία
    case "depreciation":
      return "17.2"; // Αποσβέσεις
    case "income_settlement_accounting":
      return "17.3"; // Λοιπές Τακτοποίησης Εσόδων — Λογιστική Βάση
    case "income_settlement_tax":
      return "17.4"; // Λοιπές Τακτοποίησης Εσόδων — Φορολογική Βάση
    case "expense_settlement_accounting":
      return "17.5"; // Λοιπές Τακτοποίησης Εξόδων — Λογιστική Βάση
    case "expense_settlement_tax":
      return "17.6"; // Λοιπές Τακτοποίησης Εξόδων — Φορολογική Βάση
    case "quantitative_receipt":
      // Δελτίο Ποσοτικής Παραλαβής — internal commercial doc, not
      // transmitted to myDATA. Same treatment as proforma/quote/order.
      return null;
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
  if (type === "delivery_note" || type === "delivery_note_correlated")
    return { category: "category3", type: "_" };
  // 17.x settlement entries — myDATA doesn't require classification rows
  // (the transmitted "invoice_details" carries aggregated adjustment
  // amounts, not itemized income/expense). category3 with type "_" is
  // the safe passthrough Wrapp accepts for these adjustment codes; the
  // accountant reclassifies downstream in their bookkeeping software.
  if (
    type === "income_settlement_accounting" ||
    type === "income_settlement_tax" ||
    type === "expense_settlement_accounting" ||
    type === "expense_settlement_tax" ||
    type === "payroll_entry" ||
    type === "depreciation"
  )
    return { category: "category3", type: "_" };
  // EU intra-community sales/services (1.2 / 2.2) — per Wrapp/AADE
  // classification table E3_561_005 is "Πωλήσεις αγαθών και υπηρεσιών
  // Εξωτερικού Ενδοκοινοτικές". The earlier iteration had 005 and 006
  // swapped; the Wrapp validator rejected E3_561_006 for 1.2 with
  // "Classification type E3_561_006 is forbidden for category1_3
  // combined with invoice type Item1_2".
  if (type === "eu_sale_invoice" || type === "eu_service_invoice")
    return { category: "category1_3", type: "E3_561_005" };
  // Third-country sales/services (1.3 / 2.3) — E3_561_006 "Πωλήσεις
  // αγαθών και υπηρεσιών Εξωτερικού Τρίτες Χώρες".
  if (
    type === "third_country_sale_invoice" ||
    type === "third_country_service_invoice"
  )
    return { category: "category1_3", type: "E3_561_006" };
  // Stay-tax receipts (8.2) — per Wrapp docs the line uses
  // `category1_95` (Λοιπά Πληροφοριακά Στοιχεία Εσόδων) with no
  // classification type; the tax amount rides in `other_taxes_amount`
  // + `accommodation_tax` + `other_taxes_percent_category`.
  if (type === "stay_tax_receipt")
    return { category: "category1_95", type: "_" };
  // Third-party sales / clearings / retail-for-third-party (1.4 / 1.5 /
  // 11.5) — myDATA validator rejects the previously used E3_561_007
  // combination on these codes ("Could not load valid validation doc
  // for classification with category1_3 and type E3_561_007"). Use the
  // passthrough combo Wrapp accepts and let the accountant reclassify
  // downstream.
  if (
    type === "third_party_sale_invoice" ||
    type === "third_party_sale_clearing" ||
    type === "third_party_retail_receipt"
  )
    return { category: "category3", type: "_" };
  // Rental income (8.1) and contract income (7.1) — per Wrapp/AADE
  // classification tables these fall under category1_5 (Λοιπά Έσοδα /
  // Κέρδη) with type E3_562 (Λοιπά συνήθη έσοδα). The earlier
  // category1_4 / E3_881_004 pairing was invalid.
  if (type === "rental_income" || type === "contract_income")
    return { category: "category1_5", type: "E3_562" };
  // Purchase titles (τίτλος κτήσης 3.1/3.2) — buyer-issued docs. Use
  // the informational-only combo category1_95 + "_" which myDATA
  // accepts as passthrough while the accountant reclassifies downstream.
  if (type === "purchase_title" || type === "purchase_title_refused")
    return { category: "category1_95", type: "_" };
  // Self-delivery / self-use (6.1 / 6.2) — category1_6 is a REPORTING
  // header, not a per-line code (Wrapp rejects it as "forbidden
  // combination"). The AADE-accepted per-line pairing is category1_1
  // (Έσοδα από Πώληση Εμπορευμάτων) with E3_106 (Ιδιοπαραγωγή
  // παγίων - Αυτοπαραδόσεις / Εμπορεύματα). myDATA also requires a
  // positive VAT amount on these — the user must set a real VAT rate
  // (24 / 13 / 6) on the lines, not zero.
  if (type === "self_delivery" || type === "self_use")
    return { category: "category1_1", type: "E3_106" };
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
