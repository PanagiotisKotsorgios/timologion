-- AlterTable
ALTER TABLE `businesses` ADD COLUMN `aadePasswordEnc` TEXT NULL,
    ADD COLUMN `aadeUsername` VARCHAR(120) NULL,
    ADD COLUMN `aadeVerifiedAt` DATETIME(3) NULL;
