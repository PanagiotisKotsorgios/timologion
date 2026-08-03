-- Feature flag rollout percentage.
ALTER TABLE `feature_flags`
  ADD COLUMN `rolloutPct` INT NOT NULL DEFAULT 100;

-- Announcement segment targeting (in addition to global + single-business).
ALTER TABLE `platform_announcements`
  ADD COLUMN `segment` VARCHAR(60) NULL;
