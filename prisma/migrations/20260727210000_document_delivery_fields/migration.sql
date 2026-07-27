ALTER TABLE `documents`
  ADD COLUMN `dispatchAt` DATETIME(3) NULL,
  ADD COLUMN `dispatchReason` VARCHAR(200) NULL,
  ADD COLUMN `dispatchPurpose` VARCHAR(200) NULL,
  ADD COLUMN `destinationAddress` VARCHAR(400) NULL,
  ADD COLUMN `vehicleNumber` VARCHAR(40) NULL,
  ADD COLUMN `driverName` VARCHAR(160) NULL;
