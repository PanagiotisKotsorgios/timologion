-- Recurring auto-transmit flag: when true, the cron transmits the
-- generated document to myDATA immediately instead of leaving it as a
-- draft. Additive column with a safe default so all existing templates
-- continue to behave exactly as before (draft-only).
--
-- Made idempotent via INFORMATION_SCHEMA lookup — safe to re-run even
-- if a previous partial deploy already added the column (protects
-- against Prisma checksum drift + resume-from-failed scenarios). Uses
-- the physical table name `recurring_documents` (schema declares
-- @@map("recurring_documents") — Linux MySQL is case-sensitive).
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'recurring_documents'
      AND COLUMN_NAME = 'autoTransmit'
);
SET @sql = IF(
  @col_exists = 0,
  'ALTER TABLE `recurring_documents` ADD COLUMN `autoTransmit` BOOLEAN NOT NULL DEFAULT false',
  'DO 0'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
