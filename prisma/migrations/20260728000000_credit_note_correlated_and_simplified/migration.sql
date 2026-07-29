-- Extend the DocumentType enum with two new myDATA-aligned variants.
ALTER TABLE `documents`
  MODIFY COLUMN `type` ENUM(
    'invoice',
    'service_invoice',
    'retail_receipt',
    'service_receipt',
    'simplified_invoice',
    'credit_note',
    'credit_note_correlated',
    'delivery_note',
    'proforma',
    'quote',
    'order'
  ) NOT NULL;

-- Correlated credit-note reference columns + self-referencing FK.
ALTER TABLE `documents`
  ADD COLUMN `correlatedDocumentId`   VARCHAR(191) NULL,
  ADD COLUMN `correlatedMarkOverride` VARCHAR(80)  NULL,
  ADD CONSTRAINT `documents_correlatedDocumentId_fkey`
    FOREIGN KEY (`correlatedDocumentId`)
    REFERENCES `documents`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX `documents_correlatedDocumentId_idx`
  ON `documents` (`correlatedDocumentId`);
