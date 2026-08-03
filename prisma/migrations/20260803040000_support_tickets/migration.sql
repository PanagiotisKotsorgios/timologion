-- Support ticket helpdesk.

CREATE TABLE `support_tickets` (
  `id`           VARCHAR(191) NOT NULL,
  `subject`      VARCHAR(200) NOT NULL,
  `status`       ENUM('open', 'waiting_customer', 'waiting_support', 'resolved', 'closed')
                  NOT NULL DEFAULT 'open',
  `priority`     INT          NOT NULL DEFAULT 3,
  `category`     VARCHAR(60)  NULL,
  `businessId`   VARCHAR(191) NULL,
  `userId`      VARCHAR(191) NULL,
  `fromEmail`    VARCHAR(191) NOT NULL,
  `fromName`     VARCHAR(160) NULL,
  `assignedToId` VARCHAR(191) NULL,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3)  NOT NULL,

  INDEX `support_tickets_status_updatedAt_idx`(`status`, `updatedAt`),
  INDEX `support_tickets_businessId_createdAt_idx`(`businessId`, `createdAt`),
  INDEX `support_tickets_assignedToId_status_idx`(`assignedToId`, `status`),
  CONSTRAINT `support_tickets_business_fk`
    FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `support_messages` (
  `id`          VARCHAR(191) NOT NULL,
  `ticketId`    VARCHAR(191) NOT NULL,
  `senderId`    VARCHAR(191) NULL,
  `senderEmail` VARCHAR(191) NOT NULL,
  `senderName`  VARCHAR(160) NULL,
  `body`        TEXT         NOT NULL,
  `isInternal`  BOOLEAN      NOT NULL DEFAULT FALSE,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `support_messages_ticketId_createdAt_idx`(`ticketId`, `createdAt`),
  CONSTRAINT `support_messages_ticket_fk`
    FOREIGN KEY (`ticketId`) REFERENCES `support_tickets`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
