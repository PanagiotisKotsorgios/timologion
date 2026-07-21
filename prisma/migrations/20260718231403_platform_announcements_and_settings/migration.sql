-- CreateTable
CREATE TABLE `platform_announcements` (
    `id` VARCHAR(191) NOT NULL,
    `tone` ENUM('info', 'warning', 'success') NOT NULL DEFAULT 'info',
    `title` VARCHAR(200) NOT NULL,
    `body` TEXT NOT NULL,
    `ctaHref` VARCHAR(300) NULL,
    `ctaLabel` VARCHAR(80) NULL,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `authorId` VARCHAR(191) NULL,

    INDEX `platform_announcements_publishedAt_idx`(`publishedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `app_settings` (
    `key` VARCHAR(80) NOT NULL,
    `value` TEXT NOT NULL,
    `description` VARCHAR(255) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `platform_announcements` ADD CONSTRAINT `platform_announcements_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
