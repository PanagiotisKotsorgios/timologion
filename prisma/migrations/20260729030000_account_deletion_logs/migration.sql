-- Snapshot table for permanent account deletions. Preserves who the user
-- was, what they owned, and why they left — after the User row is gone —
-- so support can answer "what happened to X" and admin can audit.
CREATE TABLE `account_deletion_logs` (
  `id`                 VARCHAR(191) NOT NULL,
  `userId`             VARCHAR(60)  NOT NULL,
  `userEmail`          VARCHAR(160) NOT NULL,
  `userFullName`       VARCHAR(160) NULL,
  `reason`             TEXT         NULL,
  `businessesDeleted`  INT          NOT NULL DEFAULT 0,
  `documentsRetained`  INT          NOT NULL DEFAULT 0,
  `snapshot`           LONGTEXT     NOT NULL,
  `ipAddress`          VARCHAR(64)  NULL,
  `userAgent`          VARCHAR(500) NULL,
  `createdAt`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `account_deletion_logs_createdAt_idx` (`createdAt`),
  INDEX `account_deletion_logs_userEmail_idx` (`userEmail`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
