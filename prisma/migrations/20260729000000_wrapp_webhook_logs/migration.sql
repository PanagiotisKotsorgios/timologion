-- Diagnostic log of every hit on /api/wrapp/webhook. Read via
-- /api/wrapp/debug (auth-gated) to answer "did Wrapp actually call us
-- back after onboarding, and if so, what did they send?".
CREATE TABLE `wrapp_webhook_logs` (
  `id`                VARCHAR(191) NOT NULL,
  `eventType`         VARCHAR(60)  NULL,
  `hasSignature`      BOOLEAN      NOT NULL DEFAULT false,
  `verificationScope` VARCHAR(20)  NULL,
  `partnerUserId`     VARCHAR(120) NULL,
  `businessMatched`   BOOLEAN      NOT NULL DEFAULT false,
  `outcome`           VARCHAR(60)  NOT NULL,
  `detail`            TEXT         NULL,
  `payloadKeys`       VARCHAR(500) NULL,
  `createdAt`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `wrapp_webhook_logs_createdAt_idx` (`createdAt`),
  INDEX `wrapp_webhook_logs_partnerUserId_createdAt_idx` (`partnerUserId`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
