-- Extend the DocumentType enum with the remaining sales-side myDATA
-- document types so we support the same catalog Timologic does.
-- Additive-only — no existing rows change type. Types skipped: 13.x /
-- 14.x / 17.x expense-side entries (they belong to a future expense
-- ingestion feature, not the doc editor).
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
    'proforma',
    'quote',
    'order'
  ) NOT NULL;
