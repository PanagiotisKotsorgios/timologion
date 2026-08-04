-- Polymorphic entity notes (admin-only annotations).
CREATE TABLE `entity_notes` (
  `id`          VARCHAR(191) NOT NULL,
  `entityType`  VARCHAR(60)  NOT NULL,
  `entityId`    VARCHAR(191) NOT NULL,
  `authorId`    VARCHAR(191) NOT NULL,
  `body`        TEXT         NOT NULL,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL,

  INDEX `entity_notes_entityType_entityId_createdAt_idx`(`entityType`, `entityId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- A/B experiments.
CREATE TABLE `experiments` (
  `key`          VARCHAR(80)  NOT NULL,
  `description`  VARCHAR(500) NULL,
  `status`       ENUM('draft', 'running', 'paused', 'completed') NOT NULL DEFAULT 'draft',
  `variantAPct`  INT          NOT NULL DEFAULT 50,
  `hypothesis`   TEXT NULL,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3)  NOT NULL,
  PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `experiment_events` (
  `id`             VARCHAR(191) NOT NULL,
  `experimentKey`  VARCHAR(80)  NOT NULL,
  `businessId`     VARCHAR(191) NULL,
  `variant`        VARCHAR(1)   NOT NULL,
  `event`          VARCHAR(60)  NOT NULL,
  `value`          DECIMAL(12, 2) NULL,
  `createdAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `experiment_events_experimentKey_event_createdAt_idx`(`experimentKey`, `event`, `createdAt`),
  INDEX `experiment_events_businessId_experimentKey_idx`(`businessId`, `experimentKey`),
  CONSTRAINT `experiment_events_experiment_fk`
    FOREIGN KEY (`experimentKey`) REFERENCES `experiments`(`key`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- API keys per tenant.
CREATE TABLE `api_keys` (
  `id`          VARCHAR(191) NOT NULL,
  `businessId`  VARCHAR(191) NOT NULL,
  `name`        VARCHAR(120) NOT NULL,
  `prefix`      VARCHAR(12)  NOT NULL,
  `keyHash`    VARCHAR(128) NOT NULL,
  `scopes`      VARCHAR(500) NULL,
  `createdById` VARCHAR(191) NULL,
  `lastUsedAt`  DATETIME(3) NULL,
  `revokedAt`   DATETIME(3) NULL,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL,

  INDEX `api_keys_businessId_idx`(`businessId`),
  INDEX `api_keys_keyHash_idx`(`keyHash`),
  CONSTRAINT `api_keys_business_fk`
    FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Alert rules + firing history.
CREATE TABLE `alert_rules` (
  `id`            VARCHAR(191) NOT NULL,
  `name`          VARCHAR(160) NOT NULL,
  `metric`        ENUM('errors_1h', 'errors_24h', 'webhook_gap_hours', 'past_due_subs',
                       'backup_age_hours', 'active_sessions', 'new_signups_24h',
                       'broken_documents')
                   NOT NULL,
  `comparator`    ENUM('gt', 'gte', 'lt', 'lte', 'eq') NOT NULL DEFAULT 'gt',
  `threshold`     DECIMAL(14, 4) NOT NULL,
  `emailTo`       VARCHAR(191) NOT NULL,
  `enabled`       BOOLEAN      NOT NULL DEFAULT TRUE,
  `cooldownMin`   INT          NOT NULL DEFAULT 60,
  `lastFiredAt`   DATETIME(3) NULL,
  `createdAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `alert_firings` (
  `id`         VARCHAR(191) NOT NULL,
  `ruleId`     VARCHAR(191) NOT NULL,
  `metric`     ENUM('errors_1h', 'errors_24h', 'webhook_gap_hours', 'past_due_subs',
                    'backup_age_hours', 'active_sessions', 'new_signups_24h',
                    'broken_documents')
                NOT NULL,
  `observed`   DECIMAL(14, 4) NOT NULL,
  `threshold`  DECIMAL(14, 4) NOT NULL,
  `emailTo`    VARCHAR(191) NOT NULL,
  `sent`       BOOLEAN     NOT NULL DEFAULT FALSE,
  `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `alert_firings_ruleId_createdAt_idx`(`ruleId`, `createdAt`),
  CONSTRAINT `alert_firings_rule_fk`
    FOREIGN KEY (`ruleId`) REFERENCES `alert_rules`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
