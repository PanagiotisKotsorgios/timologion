-- Default notes / footer text auto-injected into new document drafts.
-- Optional per business; nullable.
ALTER TABLE `businesses`
  ADD COLUMN `defaultDocumentNotes` TEXT NULL;
