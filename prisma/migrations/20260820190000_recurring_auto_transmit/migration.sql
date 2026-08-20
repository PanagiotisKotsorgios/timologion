-- Recurring auto-transmit flag: when true, the cron transmits the
-- generated document to myDATA immediately instead of leaving it as
-- a draft. Additive column with a safe default so all existing
-- templates continue to behave exactly as before (draft-only).
ALTER TABLE `RecurringDocument`
  ADD COLUMN `autoTransmit` BOOLEAN NOT NULL DEFAULT false;
