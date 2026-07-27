-- Email-based MFA challenges. One-time 6-digit codes we send via Brevo
-- for enroll / login / disable purposes. Replaces the TOTP secret model.
CREATE TABLE `mfa_challenges` (
  `id`         VARCHAR(191) NOT NULL,
  `userId`     VARCHAR(191) NOT NULL,
  `codeHash`   VARCHAR(128) NOT NULL,
  `purpose`    VARCHAR(20)  NOT NULL,
  `expiresAt`  DATETIME(3)  NOT NULL,
  `consumedAt` DATETIME(3)  NULL,
  `attempts`   INT          NOT NULL DEFAULT 0,
  `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `mfa_challenges_userId_purpose_idx` (`userId`, `purpose`),
  KEY `mfa_challenges_expiresAt_idx` (`expiresAt`),
  CONSTRAINT `mfa_challenges_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
