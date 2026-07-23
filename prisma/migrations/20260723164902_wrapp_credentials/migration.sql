-- AlterTable
ALTER TABLE `wrapp_connections` ADD COLUMN `encryptedJwt` TEXT NULL,
    ADD COLUMN `webhookEndpoint` VARCHAR(500) NULL,
    ADD COLUMN `wrappEmail` VARCHAR(160) NULL;
