-- Per-tenant announcement targeting.
ALTER TABLE `platform_announcements`
  ADD COLUMN `businessId` VARCHAR(191) NULL,
  ADD CONSTRAINT `platform_announcements_business_fk`
    FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX `platform_announcements_businessId_publishedAt_idx`
  ON `platform_announcements`(`businessId`, `publishedAt`);

-- Editable transactional email templates.
CREATE TABLE `email_templates` (
  `key`         VARCHAR(80)  NOT NULL,
  `description` VARCHAR(500) NULL,
  `subject`     VARCHAR(500) NOT NULL,
  `bodyHtml`    TEXT         NOT NULL,
  `updatedAt`   DATETIME(3)  NOT NULL,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Per-tenant rate-limit overrides.
CREATE TABLE `rate_limit_overrides` (
  `id`         VARCHAR(191) NOT NULL,
  `businessId` VARCHAR(191) NOT NULL,
  `action`     VARCHAR(60)  NOT NULL,
  `capacity`   INT          NOT NULL,
  `refillMs`   INT          NOT NULL,
  `note`       VARCHAR(500) NULL,
  `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`  DATETIME(3)  NOT NULL,

  UNIQUE INDEX `rate_limit_overrides_business_action_uidx`(`businessId`, `action`),
  CONSTRAINT `rate_limit_overrides_business_fk`
    FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
