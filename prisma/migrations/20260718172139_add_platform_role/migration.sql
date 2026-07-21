-- AlterTable
ALTER TABLE `users` ADD COLUMN `platformRole` ENUM('super_admin', 'support', 'analyst') NULL;

-- CreateIndex
CREATE INDEX `users_platformRole_idx` ON `users`(`platformRole`);
