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
      // Απόδειξη Επιστροφής (retail refund). The AADE renumbering moved
      // 8.4 to "Απόδειξη Είσπραξης POS", so we route retail refunds to
      // 11.4 (Πιστωτικό Στοιχείο Λιανικής) which is the current spec
      // code for retail credit/refund. Requires correlated parent MARK.
      return "11.4";
    case "pos_income_receipt":
      // Per the current Wrapp/AADE spec (Wrapp API docs "Είδη
      // Παραστατικών" table), 8.4 = Απόδειξη Είσπραξης POS. The old
      // numbering placed this at 8.5; migrating to 8.4 fixes the
      // classification-validator rejection ("category1_3 + E3_561_003
      // not found in invoice summary") because 8.4 has its own
      // whitelist.
      return "8.4";
    case "pos_payment_receipt":
      // 8.5 = Απόδειξη Επιστροφής POS (POS-side refund). The previous
      // "8.6" mapping was WRONG — 8.6 is now "Δελτίο Παραγγελίας
      // Εστίασης" (catering order note), so drafts of pos_payment_receipt
      // were printing as "Δελτίο Παραγγελίας Εστίασης" on the Wrapp PDF.
      return "8.5";
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
  // 17.x settlement entries. Wrapp validator refused category3/"_"
  // ("Could not load valid validation doc for classification with
  // category3 and type") AND demands expensesClassification (the
  // payload builder sets expense:true on the line). The AADE expense
  // side has dedicated codes for settlement:
  //   category2_12 = Λοιπές Εγγραφές Τακτοποίησης Εξόδων
  //   E3_588       = Ασυνήθη έξοδα, ζημιές και πρόστιμα (safe generic)
  //   E3_581_001-3 = Παροχές σε εργαζόμενους (μισθοδοσία specific)
  //   E3_587       = Αποσβέσεις (depreciation specific)
  if (type === "payroll_entry")
    return { category: "category2_6", type: "E3_581_001" };
  if (type === "depreciation")
    return { category: "category2_8", type: "E3_587" };
  if (
    type === "income_settlement_accounting" ||
    type === "income_settlement_tax" ||
    type === "expense_settlement_accounting" ||
    type === "expense_settlement_tax"
  )
    return { category: "category2_12", type: "E3_588" };
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
  // 11.5) — myDATA rejected BOTH the E3_561_007 attempt AND the
  // category3/"_" fallback ("Could not load valid validation doc for
  // classification with category category3 and type"). Move to the
  // informational-only category1_95 + "_" combo which Wrapp accepts
  // as passthrough for retail-style codes (same as POS 8.4/8.5 and
  // 8.6 catering). Accountant reclassifies downstream if needed.
  if (
    type === "third_party_sale_invoice" ||
    type === "third_party_sale_clearing" ||
    type === "third_party_retail_receipt"
  )
    return { category: "category1_95", type: "_" };
  // Rental income (8.1) and contract income (7.1) — per Wrapp/AADE
  // classification tables these fall under category1_5 (Λοιπά Έσοδα /
  // Κέρδη) with type E3_562 (Λοιπά συνήθη έσοδα). The earlier
  // category1_4 / E3_881_004 pairing was invalid.
  if (type === "rental_income" || type === "contract_income")
    return { category: "category1_5", type: "E3_562" };
  // Purchase titles (τίτλος κτήσης 3.1/3.2) — buyer-issued docs
  // paying a non-obligated seller (usually a private person for
  // one-off services). myDATA rejects income classifications on
  // these codes ("incomeClassification is forbidden for invoice
  // detail"), so the payload builder sets `expense: true` on the
  // line which flips Wrapp to emit the entry under
  // expensesClassifications. The (category, type) pair is picked
  // from the EXPENSE side of the AADE tables: category2_3 (Λήψη
  // Υπηρεσιών) + E3_585_009 (Λοιπές Αμοιβές για υπηρεσίες
  // ημεδαπής) is the safe default for freelance-style payments.
  if (type === "purchase_title" || type === "purchase_title_refused")
    return { category: "category2_3", type: "E3_585_009" };
  // Self-delivery / self-use (6.1 / 6.2) — Wrapp validator rejected
  // both the header combo (category1_6 + E3_106) and the ordinary
  // merchandise combo (category1_1 + E3_106) with "Could not load
  // valid validation doc for classification with category X and type
  // Y". Fall back to the informational-only combo category1_95 + "_"
  // — the same passthrough Wrapp uses in its own docs example for
  // 8.6 catering orders. Wrapp accepts it as "λοιπά πληροφοριακά
  // στοιχεία εσόδων" without validating the E3 code; the accountant
  // reclassifies downstream. myDATA still requires a positive VAT
  // amount on 6.1/6.2 (real Greek VAT rate on the lines, not zero).
  if (type === "self_delivery" || type === "self_use")
    return { category: "category1_95", type: "_" };
  // Retail refund + retail credit follow the retail flow.
  if (type === "retail_refund_receipt" || type === "retail_credit_note")
    return { category: "category1_3", type: "E3_561_003" };
  // POS receipts (8.4 Είσπραξη / 8.5 Επιστροφή). Wrapp rejects
  // category1_3 + E3_561_003 on these codes ("Could not load valid
  // validation doc for classification with category1_3 and type
  // E3_561_003; ... not found in invoice summary"), so we use the
  // informational passthrough category1_95 + "_" that Wrapp's own
  // docs example uses for 8.6 catering order notes.
  if (type === "pos_income_receipt" || type === "pos_payment_receipt")
    return { category: "category1_95", type: "_" };
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
