-- ─── Suppliers ─────────────────────────────────────────────────────────
CREATE TABLE `suppliers` (
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
  `iban` VARCHAR(40) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `suppliers_businessId_legalName_idx` (`businessId`, `legalName`),
  KEY `suppliers_businessId_vatNumber_idx` (`businessId`, `vatNumber`),
  CONSTRAINT `suppliers_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Expenses ──────────────────────────────────────────────────────────
CREATE TABLE `expenses` (
  `id` VARCHAR(191) NOT NULL,
  `businessId` VARCHAR(191) NOT NULL,
  `supplierId` VARCHAR(191) NULL,
  `category` VARCHAR(80) NULL,
  `reference` VARCHAR(80) NULL,
  `description` TEXT NULL,
  `netAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `vatRate` DECIMAL(4, 2) NOT NULL DEFAULT 24,
  `vatAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `totalAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'EUR',
  `paidAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `issueDate` DATETIME(3) NOT NULL,
  `paymentStatus` ENUM('unpaid', 'partial', 'paid') NOT NULL DEFAULT 'unpaid',
  `status` ENUM('draft', 'recorded', 'cancelled') NOT NULL DEFAULT 'recorded',
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `expenses_businessId_issueDate_idx` (`businessId`, `issueDate`),
  KEY `expenses_businessId_paymentStatus_idx` (`businessId`, `paymentStatus`),
  KEY `expenses_supplierId_idx` (`supplierId`),
  CONSTRAINT `expenses_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `expenses_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Expense payments ──────────────────────────────────────────────────
CREATE TABLE `expense_payments` (
  `id` VARCHAR(191) NOT NULL,
  `businessId` VARCHAR(191) NOT NULL,
  `expenseId` VARCHAR(191) NULL,
  `supplierId` VARCHAR(191) NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `method` ENUM('cash', 'card', 'bank_transfer', 'iris', 'check', 'credit', 'other') NOT NULL DEFAULT 'bank_transfer',
  `reference` VARCHAR(160) NULL,
  `notes` TEXT NULL,
  `paidAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `expense_payments_businessId_paidAt_idx` (`businessId`, `paidAt`),
  KEY `expense_payments_expenseId_idx` (`expenseId`),
  KEY `expense_payments_supplierId_idx` (`supplierId`),
  CONSTRAINT `expense_payments_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `expense_payments_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `expenses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `expense_payments_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
