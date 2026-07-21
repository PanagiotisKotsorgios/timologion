-- CreateTable
CREATE TABLE `payments` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NULL,
    `documentId` VARCHAR(191) NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `method` ENUM('cash', 'card', 'bank_transfer', 'iris', 'check', 'credit', 'other') NOT NULL DEFAULT 'cash',
    `reference` VARCHAR(160) NULL,
    `notes` TEXT NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payments_businessId_receivedAt_idx`(`businessId`, `receivedAt`),
    INDEX `payments_documentId_idx`(`documentId`),
    INDEX `payments_clientId_idx`(`clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recurring_documents` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `billingBookId` VARCHAR(191) NULL,
    `branchId` VARCHAR(191) NULL,
    `type` ENUM('invoice', 'service_invoice', 'retail_receipt', 'service_receipt', 'credit_note', 'proforma', 'quote', 'order', 'delivery_note') NOT NULL,
    `label` VARCHAR(160) NOT NULL,
    `cadence` ENUM('weekly', 'monthly', 'quarterly', 'yearly') NOT NULL DEFAULT 'monthly',
    `status` ENUM('active', 'paused', 'ended') NOT NULL DEFAULT 'active',
    `nextRunAt` DATETIME(3) NOT NULL,
    `lastRunAt` DATETIME(3) NULL,
    `paymentMethod` VARCHAR(80) NULL,
    `notes` TEXT NULL,
    `linesJson` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `recurring_documents_businessId_nextRunAt_idx`(`businessId`, `nextRunAt`),
    INDEX `recurring_documents_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_documents` ADD CONSTRAINT `recurring_documents_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_documents` ADD CONSTRAINT `recurring_documents_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_documents` ADD CONSTRAINT `recurring_documents_billingBookId_fkey` FOREIGN KEY (`billingBookId`) REFERENCES `billing_books`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_documents` ADD CONSTRAINT `recurring_documents_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
