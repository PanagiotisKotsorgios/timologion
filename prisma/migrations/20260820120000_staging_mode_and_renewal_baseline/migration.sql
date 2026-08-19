-- Two additive columns for two independent features:
--
-- 1. documents.stagingMode — tenant-visible flag so a doc created
--    while /staging cookie was set is visually distinguishable from
--    a real production doc (list badge + detail-view banner). No
--    existing rows change; the default is false so pre-cutover docs
--    are correctly marked as "not staging".
--
-- 2. wrapp_connections.issuedCountBaseline — snapshot of Wrapp's
--    cumulative issued-count taken at the moment the tenant's current
--    subscription period started. The renewal cron uses
--    (issuedCountUpstream - issuedCountBaseline) to compute usage
--    inside the current period; NULL means "no baseline yet" and the
--    cron treats it as 0 (used = upstream).
--
-- Both fields are safe to add on a live DB. No indexes needed —
-- neither is queried on its own.

ALTER TABLE `documents`
  ADD COLUMN `stagingMode` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `wrapp_connections`
  ADD COLUMN `issuedCountBaseline` INT NULL;
