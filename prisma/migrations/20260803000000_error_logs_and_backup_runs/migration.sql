-- Error log table for the in-app error dashboard. Populated by
-- logger.error() in production; readable from /admin/errors.
CREATE TABLE `error_logs` (
    `id`          VARCHAR(191) NOT NULL,
    `level`       ENUM('warn', 'error') NOT NULL DEFAULT 'error',
    `message`     VARCHAR(500) NOT NULL,
    `fingerprint` VARCHAR(64)  NOT NULL,
    `stack`       TEXT NULL,
    `path`        VARCHAR(500) NULL,
    `userId`      VARCHAR(191) NULL,
    `businessId`  VARCHAR(191) NULL,
    `meta`        TEXT NULL,
    `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `error_logs_createdAt_idx`(`createdAt`),
    INDEX `error_logs_fingerprint_createdAt_idx`(`fingerprint`, `createdAt`),
    INDEX `error_logs_businessId_createdAt_idx`(`businessId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Backup run history: which dumps ran, when, size, target location.
CREATE TABLE `backup_runs` (
    `id`         VARCHAR(191) NOT NULL,
    `status`     ENUM('running', 'success', 'failed') NOT NULL DEFAULT 'running',
    `target`     VARCHAR(500) NOT NULL,
    `bytes`      BIGINT       NOT NULL DEFAULT 0,
    `durationMs` INT          NOT NULL DEFAULT 0,
    `error`      TEXT NULL,
    `startedAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finishedAt` DATETIME(3) NULL,

    INDEX `backup_runs_startedAt_idx`(`startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
