-- Round out myDATA sales-side coverage before production. Adds:
--
--   ─ 9.3 correlated variant  (delivery_note_correlated) — same wire
--     code as 9.3 but carries a mandatory parent MARK, symmetric to
--     credit_note_correlated (5.1).
--
--   ─ Δελτίο Ποσοτικής Παραλαβής (quantitative_receipt) — internal
--     commercial doc, not transmitted to myDATA. Same handling as
--     proforma / quote / order.
--
--   ─ 17.x Λοιπές Εγγραφές Τακτοποίησης (year-end settlement entries):
--       17.1 Εσόδων - Λογιστική Βάση     income_settlement_accounting
--       17.2 Εσόδων - Φορολογική Βάση    income_settlement_tax
--       17.3 Εξόδων - Λογιστική Βάση     expense_settlement_accounting
--       17.4 Εξόδων - Φορολογική Βάση    expense_settlement_tax
--       17.5 Ενσωμάτωση Μισθοδοσίας      payroll_entry
--       17.6 Αποσβέσεις                  depreciation
--
-- All three tables that share the DocumentType enum need the extension —
-- the previous silent-truncation bug (see 20260806130000) taught us not
-- to trust the Prisma diff generator on multi-column enums.
--
-- Also adds `loadingAddress` (τόπος φόρτωσης) to Document so 9.3 /
-- delivery_note_correlated can carry an explicit loading point instead
-- of always falling back to the issuer's branch address.

ALTER TABLE `documents`
  MODIFY COLUMN `type` ENUM(
    'invoice',
    'service_invoice',
    'retail_receipt',
    'service_receipt',
    'simplified_invoice',
    'eu_sale_invoice',
    'third_country_sale_invoice',
    'eu_service_invoice',
    'third_country_service_invoice',
    'credit_note',
    'credit_note_correlated',
    'delivery_note',
    'stay_tax_receipt',
    'third_party_sale_invoice',
    'third_party_sale_clearing',
    'complementary_invoice',
    'complementary_service_invoice',
    'purchase_title',
    'purchase_title_refused',
    'self_delivery',
    'self_use',
    'contract_income',
    'rental_income',
    'retail_refund_receipt',
    'pos_income_receipt',
    'pos_payment_receipt',
    'retail_credit_note',
    'third_party_retail_receipt',
    'delivery_note_correlated',
    'quantitative_receipt',
    'income_settlement_accounting',
    'income_settlement_tax',
    'expense_settlement_accounting',
    'expense_settlement_tax',
    'payroll_entry',
    'depreciation',
    'proforma',
    'quote',
    'order'
  ) NOT NULL;

ALTER TABLE `billing_books`
  MODIFY COLUMN `documentType` ENUM(
    'invoice',
    'service_invoice',
    'retail_receipt',
    'service_receipt',
    'simplified_invoice',
    'eu_sale_invoice',
    'third_country_sale_invoice',
    'eu_service_invoice',
    'third_country_service_invoice',
    'credit_note',
    'credit_note_correlated',
    'delivery_note',
    'stay_tax_receipt',
    'third_party_sale_invoice',
    'third_party_sale_clearing',
    'complementary_invoice',
    'complementary_service_invoice',
    'purchase_title',
    'purchase_title_refused',
    'self_delivery',
    'self_use',
    'contract_income',
    'rental_income',
    'retail_refund_receipt',
    'pos_income_receipt',
    'pos_payment_receipt',
    'retail_credit_note',
    'third_party_retail_receipt',
    'delivery_note_correlated',
    'quantitative_receipt',
    'income_settlement_accounting',
    'income_settlement_tax',
    'expense_settlement_accounting',
    'expense_settlement_tax',
    'payroll_entry',
    'depreciation',
    'proforma',
    'quote',
    'order'
  ) NOT NULL;

ALTER TABLE `recurring_documents`
  MODIFY COLUMN `type` ENUM(
    'invoice',
    'service_invoice',
    'retail_receipt',
    'service_receipt',
    'simplified_invoice',
    'eu_sale_invoice',
    'third_country_sale_invoice',
    'eu_service_invoice',
    'third_country_service_invoice',
    'credit_note',
    'credit_note_correlated',
    'delivery_note',
    'stay_tax_receipt',
    'third_party_sale_invoice',
    'third_party_sale_clearing',
    'complementary_invoice',
    'complementary_service_invoice',
    'purchase_title',
    'purchase_title_refused',
    'self_delivery',
    'self_use',
    'contract_income',
    'rental_income',
    'retail_refund_receipt',
    'pos_income_receipt',
    'pos_payment_receipt',
    'retail_credit_note',
    'third_party_retail_receipt',
    'delivery_note_correlated',
    'quantitative_receipt',
    'income_settlement_accounting',
    'income_settlement_tax',
    'expense_settlement_accounting',
    'expense_settlement_tax',
    'payroll_entry',
    'depreciation',
    'proforma',
    'quote',
    'order'
  ) NOT NULL;

ALTER TABLE `documents`
  ADD COLUMN `loadingAddress` VARCHAR(400) NULL AFTER `dispatchPurpose`;
