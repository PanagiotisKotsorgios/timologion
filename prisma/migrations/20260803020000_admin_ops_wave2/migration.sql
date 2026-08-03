-- Cron run history + broadcast email history.

CREATE TABLE `cron_runs` (
  `id`         VARCHAR(191) NOT NULL,
  `jobKey`     VARCHAR(60)  NOT NULL,
  `status`     ENUM('running', 'success', 'failed') NOT NULL DEFAULT 'running',
  `itemsDone`  INT          NOT NULL DEFAULT 0,
  `durationMs` INT          NOT NULL DEFAULT 0,
  `error`      TEXT NULL,
  `startedAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `finishedAt` DATETIME(3) NULL,

  INDEX `cron_runs_jobKey_startedAt_idx`(`jobKey`, `startedAt`),
  INDEX `cron_runs_startedAt_idx`(`startedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `broadcasts` (
  `id`         VARCHAR(191) NOT NULL,
  `senderId`   VARCHAR(191) NOT NULL,
  `segment`    VARCHAR(120) NOT NULL,
  `subject`    VARCHAR(500) NOT NULL,
  `bodyHtml`   TEXT         NOT NULL,
  `recipients` INT          NOT NULL DEFAULT 0,
  `sent`       INT          NOT NULL DEFAULT 0,
  `failed`     INT          NOT NULL DEFAULT 0,
  `dryRun`     BOOLEAN      NOT NULL DEFAULT FALSE,
  `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `broadcasts_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
