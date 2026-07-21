-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `fullName` VARCHAR(120) NOT NULL,
    `mfaEnabled` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(128) NOT NULL,
    `activeBusinessId` VARCHAR(191) NULL,
    `userAgent` VARCHAR(255) NULL,
    `ipAddress` VARCHAR(64) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sessions_tokenHash_key`(`tokenHash`),
    INDEX `sessions_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `businesses` (
    `id` VARCHAR(191) NOT NULL,
    `vatNumber` VARCHAR(20) NOT NULL,
    `legalName` VARCHAR(160) NOT NULL,
    `tradeName` VARCHAR(160) NULL,
    `taxOffice` VARCHAR(120) NULL,
    `activity` VARCHAR(200) NULL,
    `addressLine` VARCHAR(200) NULL,
    `city` VARCHAR(80) NULL,
    `postalCode` VARCHAR(20) NULL,
    `country` VARCHAR(2) NOT NULL DEFAULT 'GR',
    `phone` VARCHAR(30) NULL,
    `email` VARCHAR(160) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `businesses_vatNumber_idx`(`vatNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `branches` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(120) NOT NULL,
    `addressLine` VARCHAR(200) NULL,
    `city` VARCHAR(80) NULL,
    `postalCode` VARCHAR(20) NULL,
    `phone` VARCHAR(30) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `wrappBranchId` VARCHAR(120) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `branches_businessId_idx`(`businessId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `billing_books` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `documentType` ENUM('invoice', 'service_invoice', 'retail_receipt', 'service_receipt', 'credit_note', 'proforma', 'quote', 'order', 'delivery_note') NOT NULL,
    `series` VARCHAR(20) NOT NULL,
    `label` VARCHAR(120) NULL,
    `nextNumber` INTEGER NOT NULL DEFAULT 1,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `wrappBookId` VARCHAR(120) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `billing_books_businessId_documentType_idx`(`businessId`, `documentType`),
    UNIQUE INDEX `billing_books_businessId_documentType_series_key`(`businessId`, `documentType`, `series`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `business_members` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `role` ENUM('owner', 'admin', 'accountant', 'staff', 'sales', 'readonly') NOT NULL DEFAULT 'staff',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `business_members_businessId_idx`(`businessId`),
    UNIQUE INDEX `business_members_userId_businessId_key`(`userId`, `businessId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wrapp_connections` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `status` ENUM('inactive', 'pending', 'active', 'error') NOT NULL DEFAULT 'inactive',
    `wrappUserId` VARCHAR(120) NULL,
    `hasPlan` BOOLEAN NOT NULL DEFAULT false,
    `canIssueInvoice` BOOLEAN NOT NULL DEFAULT false,
    `encryptedApiKey` TEXT NULL,
    `jwtExpiresAt` DATETIME(3) NULL,
    `lastVerifiedAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `wrapp_connections_businessId_key`(`businessId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(80) NOT NULL,
    `entityType` VARCHAR(60) NULL,
    `entityId` VARCHAR(60) NULL,
    `meta` TEXT NULL,
    `ipAddress` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_businessId_createdAt_idx`(`businessId`, `createdAt`),
    INDEX `audit_logs_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `vatNumber` VARCHAR(20) NULL,
    `legalName` VARCHAR(160) NOT NULL,
    `tradeName` VARCHAR(160) NULL,
    `taxOffice` VARCHAR(120) NULL,
    `activity` VARCHAR(200) NULL,
    `addressLine` VARCHAR(200) NULL,
    `city` VARCHAR(80) NULL,
    `postalCode` VARCHAR(20) NULL,
    `country` VARCHAR(2) NOT NULL DEFAULT 'GR',
    `email` VARCHAR(160) NULL,
    `phone` VARCHAR(30) NULL,
    `notes` TEXT NULL,
    `tags` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `clients_businessId_legalName_idx`(`businessId`, `legalName`),
    INDEX `clients_businessId_vatNumber_idx`(`businessId`, `vatNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_contacts` (
    `id` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(160) NULL,
    `phone` VARCHAR(30) NULL,
    `role` VARCHAR(80) NULL,

    INDEX `client_contacts_clientId_idx`(`clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `items` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `kind` ENUM('service', 'product') NOT NULL DEFAULT 'service',
    `code` VARCHAR(60) NULL,
    `name` VARCHAR(160) NOT NULL,
    `description` TEXT NULL,
    `unit` VARCHAR(20) NOT NULL DEFAULT 'τμχ',
    `defaultPrice` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `vatRate` DECIMAL(5, 2) NOT NULL DEFAULT 24,
    `vatCategory` VARCHAR(20) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `items_businessId_kind_idx`(`businessId`, `kind`),
    INDEX `items_businessId_name_idx`(`businessId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documents` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NULL,
    `branchId` VARCHAR(191) NULL,
    `billingBookId` VARCHAR(191) NULL,
    `type` ENUM('invoice', 'service_invoice', 'retail_receipt', 'service_receipt', 'credit_note', 'proforma', 'quote', 'order', 'delivery_note') NOT NULL,
    `status` ENUM('draft', 'sending', 'issued', 'failed', 'cancelled') NOT NULL DEFAULT 'draft',
    `paymentStatus` ENUM('unpaid', 'partial', 'paid') NOT NULL DEFAULT 'unpaid',
    `series` VARCHAR(20) NULL,
    `number` INTEGER NULL,
    `issueDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` TEXT NULL,
    `netTotalAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `vatTotalAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `payableTotalAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `wrappInvoiceId` VARCHAR(120) NULL,
    `wrappInvoiceUrl` VARCHAR(500) NULL,
    `wrappInvoiceUrlEn` VARCHAR(500) NULL,
    `myDataMark` VARCHAR(80) NULL,
    `myDataUid` VARCHAR(80) NULL,
    `myDataQrUrl` VARCHAR(500) NULL,
    `lastWrappPayload` TEXT NULL,
    `lastWrappError` TEXT NULL,
    `issuedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `documents_businessId_status_idx`(`businessId`, `status`),
    INDEX `documents_businessId_issueDate_idx`(`businessId`, `issueDate`),
    INDEX `documents_businessId_clientId_idx`(`businessId`, `clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_lines` (
    `id` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NULL,
    `ordinal` INTEGER NOT NULL DEFAULT 0,
    `description` VARCHAR(255) NOT NULL,
    `quantity` DECIMAL(12, 3) NOT NULL DEFAULT 1,
    `unit` VARCHAR(20) NOT NULL DEFAULT 'τμχ',
    `unitPrice` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discountPct` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `vatRate` DECIMAL(5, 2) NOT NULL DEFAULT 24,
    `netAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `vatAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,

    INDEX `document_lines_documentId_idx`(`documentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `branches` ADD CONSTRAINT `branches_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `billing_books` ADD CONSTRAINT `billing_books_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `billing_books` ADD CONSTRAINT `billing_books_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `business_members` ADD CONSTRAINT `business_members_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `business_members` ADD CONSTRAINT `business_members_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wrapp_connections` ADD CONSTRAINT `wrapp_connections_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_contacts` ADD CONSTRAINT `client_contacts_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `items` ADD CONSTRAINT `items_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_billingBookId_fkey` FOREIGN KEY (`billingBookId`) REFERENCES `billing_books`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_lines` ADD CONSTRAINT `document_lines_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_lines` ADD CONSTRAINT `document_lines_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
