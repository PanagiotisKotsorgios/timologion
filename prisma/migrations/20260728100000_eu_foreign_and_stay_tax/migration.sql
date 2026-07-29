-- Extend the DocumentType enum with EU / third-country invoice variants
-- and the hotel stay-tax receipt (myDATA 1.2 / 1.3 / 2.2 / 2.3 / 8.2).
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
    'proforma',
    'quote',
    'order'
  ) NOT NULL;

-- Foreign-transaction fields (nullable, populated on 1.2 / 1.3 / 2.2 / 2.3).
ALTER TABLE `documents`
  ADD COLUMN `currency`     VARCHAR(3) NULL,
  ADD COLUMN `exchangeRate` DECIMAL(10, 4) NULL;

-- Stay-tax fields (nullable, populated only on 8.2).
ALTER TABLE `documents`
  ADD COLUMN `stayTaxCategory` VARCHAR(60) NULL,
  ADD COLUMN `stayTaxAmount`   DECIMAL(12, 2) NULL;
