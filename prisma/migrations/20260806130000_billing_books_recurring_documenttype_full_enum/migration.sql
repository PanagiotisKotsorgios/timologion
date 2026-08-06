-- Align `billing_books.documentType` and `recurring_documents.type` with
-- the full DocumentType enum in the Prisma schema.
--
-- Root cause of the "Data truncated for column 'documentType'" MySQL
-- error (code 1265) users hit when clicking "Έκδοση πιστωτικού": prior
-- migrations that extended the DocumentType enum
--   (20260728000000_credit_note_correlated_and_simplified,
--    20260729010000_mydata_full_coverage)
-- only touched `documents.type`. The two OTHER tables that use the same
-- Prisma enum — billing_books + recurring_documents — kept the original
-- 9-value ENUM from the init migration, so any INSERT with a newer type
-- (credit_note_correlated, retail_credit_note, eu_sale_invoice, …)
-- silently truncated and the Prisma layer surfaced it as a create
-- failure. Notably this broke ensureDefaultBillingBook for every
-- non-vanilla document type, which in turn broke auto-transmit of
-- credit notes.
--
-- Additive-only. No existing rows change type; every current value is
-- inside the new enum.

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
    'proforma',
    'quote',
    'order'
  ) NOT NULL;
