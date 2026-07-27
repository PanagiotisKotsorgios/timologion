ALTER TABLE `appointments`
  ADD COLUMN `locationType` ENUM('in_person', 'online', 'phone') NOT NULL DEFAULT 'in_person',
  ADD COLUMN `locationDetail` VARCHAR(400) NULL,
  ADD COLUMN `reminderMinutesBefore` INT NULL,
  ADD COLUMN `parentAppointmentId` VARCHAR(191) NULL;

CREATE INDEX `appointments_parentAppointmentId_idx`
  ON `appointments` (`parentAppointmentId`);
