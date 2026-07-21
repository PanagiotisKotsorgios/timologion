-- AlterTable
ALTER TABLE `businesses` ADD COLUMN `suspendedAt` DATETIME(3) NULL,
    ADD COLUMN `suspendedReason` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `suspendedAt` DATETIME(3) NULL,
    ADD COLUMN `suspendedReason` VARCHAR(255) NULL;
