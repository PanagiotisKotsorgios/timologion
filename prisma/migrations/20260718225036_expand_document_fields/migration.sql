-- AlterTable
ALTER TABLE `documents` ADD COLUMN `additionalTaxes` TEXT NULL,
    ADD COLUMN `deliveryNoteRef` VARCHAR(120) NULL,
    ADD COLUMN `paymentMethod` VARCHAR(80) NULL,
    ADD COLUMN `printLanguage` VARCHAR(2) NOT NULL DEFAULT 'el';
