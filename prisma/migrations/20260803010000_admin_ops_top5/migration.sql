-- Admin ops top-5 changes: support notes/tags + feature flags.

-- 1) Business support notes + admin tags (comma-separated).
ALTER TABLE `businesses`
  ADD COLUMN `supportNotes` TEXT NULL,
  ADD COLUMN `supportTags`  VARCHAR(500) NULL;

-- 2) Feature flags — global rollout switch + per-business override.
CREATE TABLE `feature_flags` (
  `key`         VARCHAR(80)  NOT NULL,
  `description` VARCHAR(500) NULL,
  `rollout`     ENUM('none', 'beta', 'all') NOT NULL DEFAULT 'none',
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL,
  PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `business_feature_flags` (
  `businessId` VARCHAR(191) NOT NULL,
  `flagKey`    VARCHAR(80)  NOT NULL,
  `enabled`    BOOLEAN      NOT NULL,
  `updatedAt`  DATETIME(3)  NOT NULL,

  PRIMARY KEY (`businessId`, `flagKey`),
  INDEX `business_feature_flags_flagKey_idx`(`flagKey`),
  CONSTRAINT `bff_business_fk`
    FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `bff_flag_fk`
    FOREIGN KEY (`flagKey`) REFERENCES `feature_flags`(`key`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
