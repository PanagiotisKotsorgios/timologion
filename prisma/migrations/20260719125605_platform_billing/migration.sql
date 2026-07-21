-- CreateTable
CREATE TABLE `platform_plans` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(400) NULL,
    `priceMonthly` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `priceYearly` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `includedDocsMonth` INTEGER NOT NULL DEFAULT 0,
    `features` TEXT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 100,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `platform_plans_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `business_subscriptions` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `billingCycle` ENUM('monthly', 'yearly') NOT NULL DEFAULT 'monthly',
    `status` ENUM('trialing', 'active', 'past_due', 'cancelled') NOT NULL DEFAULT 'active',
    `priceOverride` DECIMAL(12, 2) NULL,
    `currentPeriodStart` DATETIME(3) NOT NULL,
    `currentPeriodEnd` DATETIME(3) NOT NULL,
    `nextBillingAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `business_subscriptions_businessId_idx`(`businessId`),
    INDEX `business_subscriptions_status_idx`(`status`),
    INDEX `business_subscriptions_nextBillingAt_idx`(`nextBillingAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platform_invoices` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `subscriptionId` VARCHAR(191) NULL,
    `periodStart` DATETIME(3) NULL,
    `periodEnd` DATETIME(3) NULL,
    `status` ENUM('draft', 'sending', 'issued', 'failed', 'cancelled') NOT NULL DEFAULT 'draft',
    `series` VARCHAR(20) NULL,
    `number` INTEGER NULL,
    `issueDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `description` VARCHAR(255) NOT NULL,
    `netAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `vatAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `providerCost` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `providerRebate` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `margin` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `wrappInvoiceId` VARCHAR(120) NULL,
    `wrappInvoiceUrl` VARCHAR(500) NULL,
    `myDataMark` VARCHAR(80) NULL,
    `myDataUid` VARCHAR(80) NULL,
    `issuedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `platform_invoices_businessId_idx`(`businessId`),
    INDEX `platform_invoices_status_issueDate_idx`(`status`, `issueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `provider_costs` (
    `id` VARCHAR(191) NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `netAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `vatAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `description` VARCHAR(255) NULL,
    `invoicedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `provider_costs_businessId_periodStart_idx`(`businessId`, `periodStart`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `business_subscriptions` ADD CONSTRAINT `business_subscriptions_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `business_subscriptions` ADD CONSTRAINT `business_subscriptions_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `platform_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `platform_invoices` ADD CONSTRAINT `platform_invoices_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `platform_invoices` ADD CONSTRAINT `platform_invoices_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `business_subscriptions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `provider_costs` ADD CONSTRAINT `provider_costs_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
