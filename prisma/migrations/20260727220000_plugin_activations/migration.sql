CREATE TABLE `plugin_activations` (
  `id` VARCHAR(191) NOT NULL,
  `businessId` VARCHAR(191) NOT NULL,
  `pluginCode` VARCHAR(40) NOT NULL,
  `status` ENUM('trialing', 'active', 'expired', 'cancelled') NOT NULL DEFAULT 'trialing',
  `trialStartedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `trialEndsAt` DATETIME(3) NOT NULL,
  `paidUntilAt` DATETIME(3) NULL,
  `priceMonthly` DECIMAL(8, 2) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `plugin_activations_businessId_pluginCode_key` (`businessId`, `pluginCode`),
  KEY `plugin_activations_businessId_status_idx` (`businessId`, `status`),
  CONSTRAINT `plugin_activations_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
