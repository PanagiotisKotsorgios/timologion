-- Cached upstream issued_count from Wrapp so the dashboard can show
-- authoritative usage without an API call per pageview. Refreshed by
-- /api/cron/wrapp-reconcile nightly.
ALTER TABLE `wrapp_connections`
  ADD COLUMN `issuedCountUpstream` INT NULL,
  ADD COLUMN `issuedCountAt`       DATETIME(3) NULL;
