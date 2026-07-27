ALTER TABLE `users`
  ADD COLUMN `sessionTimeoutMinutes` INT NOT NULL DEFAULT 60;
