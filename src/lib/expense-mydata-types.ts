/**
 * myDATA expense-side type catalog (13.x / 14.x / 15.x / 16.x / 17.x).
 * These codes are chosen by the accountant when recording an incoming
 * expense/invoice/receipt. They map to ΑΑΔΕ's classification of *what
 * the expense is* — used both for local reporting and (once wired) for
 * Wrapp's expense submission API.
 *
 * Kept as a plain constant + Zod-friendly string union rather than a
 * Prisma enum: expense codes evolve independently of the doc-editor
 * enum and free-form fallback is important for edge cases.
 */

export const EXPENSE_MYDATA_TYPES = [
  {
    code: "13.1",
    value: "expense_wholesale",
    label: "13.1 — Έξοδα / Αγορές λιανικών συναλλαγών",
    hint: "Λιανική αγορά αγαθών από ημεδαπή ή αλλοδαπή.",
  },
  {
    code: "13.2",
    value: "expense_retail_services",
    label: "13.2 — Παροχή λιανικών συναλλαγών",
    hint: "Λήψη λιανικών υπηρεσιών (π.χ. καφενείο, βενζινάδικο).",
  },
  {
    code: "13.30",
    value: "expense_dynamic_category",
    label: "13.30 — Παραστατικά οντότητας (δυναμική κατηγορία)",
    hint: "Έξοδα που δηλώνει η οντότητα από τα δικά της βιβλία.",
  },
  {
    code: "13.31",
    value: "expense_retail_credit",
    label: "13.31 — Πιστωτικό στοιχείο λιανικής",
    hint: "Επιστροφή/πιστωτικό από λιανική αγορά.",
  },
  {
    code: "14.1",
    value: "purchase_eu_acquisition",
    label: "14.1 — Ενδοκοινοτικές αποκτήσεις (αγαθά)",
    hint: "Αγορά αγαθών από χώρα ΕΕ.",
  },
  {
    code: "14.2",
    value: "purchase_third_country",
    label: "14.2 — Αποκτήσεις τρίτων χωρών (αγαθά)",
    hint: "Αγορά αγαθών από χώρα εκτός ΕΕ (εισαγωγή).",
  },
  {
    code: "14.3",
    value: "service_reception_eu",
    label: "14.3 — Ενδοκοινοτική λήψη υπηρεσιών",
    hint: "Υπηρεσία από πάροχο σε χώρα ΕΕ.",
  },
  {
    code: "14.4",
    value: "service_reception_third_country",
    label: "14.4 — Λήψη υπηρεσιών τρίτων χωρών",
    hint: "Υπηρεσία από πάροχο εκτός ΕΕ.",
  },
  {
    code: "14.5",
    value: "insurance_contribution",
    label: "14.5 — ΕΦΚΑ & λοιποί ασφαλιστικοί οργανισμοί",
    hint: "Εισφορές ΕΦΚΑ / ασφαλιστικοί οργανισμοί.",
  },
  {
    code: "15.1",
    value: "contract_expense",
    label: "15.1 — Συμβόλαιο (έξοδο)",
    hint: "Συμβολαιογραφική δαπάνη (π.χ. αγορά ακινήτου).",
  },
  {
    code: "16.1",
    value: "rental_expense",
    label: "16.1 — Ενοίκιο (έξοδο)",
    hint: "Ενοίκιο για επαγγελματική στέγη ή εξοπλισμό.",
  },
  {
    code: "17.1",
    value: "payroll",
    label: "17.1 — Μισθοδοσία",
    hint: "Μηνιαία μισθοδοσία προσωπικού.",
  },
  {
    code: "17.2",
    value: "depreciation",
    label: "17.2 — Αποσβέσεις",
    hint: "Λογιστικές αποσβέσεις παγίων.",
  },
  {
    code: "17.3",
    value: "adjustment_income_book",
    label: "17.3 — Τακτοποίηση εσόδων (λογιστική βάση)",
    hint: "Λοιπές εγγραφές τακτοποίησης εσόδων — λογιστική βάση.",
  },
  {
    code: "17.4",
    value: "adjustment_income_tax",
    label: "17.4 — Τακτοποίηση εσόδων (φορολογική βάση)",
    hint: "Λοιπές εγγραφές τακτοποίησης εσόδων — φορολογική βάση.",
  },
  {
    code: "17.5",
    value: "adjustment_expense_book",
    label: "17.5 — Τακτοποίηση εξόδων (λογιστική βάση)",
    hint: "Λοιπές εγγραφές τακτοποίησης εξόδων — λογιστική βάση.",
  },
  {
    code: "17.6",
    value: "adjustment_expense_tax",
    label: "17.6 — Τακτοποίηση εξόδων (φορολογική βάση)",
    hint: "Λοιπές εγγραφές τακτοποίησης εξόδων — φορολογική βάση.",
  },
] as const;

export type ExpenseMyDataType = (typeof EXPENSE_MYDATA_TYPES)[number]["value"];

/**
 * Map an internal expense myDATA type to the ΑΑΔΕ code string that Wrapp
 * (and any other provider) expects on the expense submission. Returns
 * `null` for the empty/unset case so callers can `undefined` the field.
 */
export function expenseMyDataCode(
  v: ExpenseMyDataType | string | null | undefined,
): string | null {
  if (!v) return null;
  const hit = EXPENSE_MYDATA_TYPES.find((t) => t.value === v);
  return hit?.code ?? null;
}

/** Cheap lookup used for label rendering in lists / exports. */
export function expenseMyDataLabel(
  v: ExpenseMyDataType | string | null | undefined,
): string | null {
  if (!v) return null;
  const hit = EXPENSE_MYDATA_TYPES.find((t) => t.value === v);
  return hit?.label ?? null;
}

export const EXPENSE_MYDATA_VALUES = EXPENSE_MYDATA_TYPES.map((t) => t.value) as [
  ExpenseMyDataType,
  ...ExpenseMyDataType[],
];
