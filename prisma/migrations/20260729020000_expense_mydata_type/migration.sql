-- Add myDATA classification code (13.x / 14.x / 15.x / 16.x / 17.x)
-- to Expense rows. Nullable — existing legacy rows and drafts
-- without classification stay empty until the accountant fills them in.
-- Not a MySQL ENUM because expense codes evolve independently of the
-- doc-editor DocumentType enum; validation lives in Zod + the shared
-- constant list in lib/expense-mydata-types.ts.
ALTER TABLE `expenses`
  ADD COLUMN `myDataType` VARCHAR(40) NULL;

CREATE INDEX `expenses_businessId_myDataType_idx`
  ON `expenses` (`businessId`, `myDataType`);
