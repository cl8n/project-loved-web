CREATE TABLE `mapper_consents` (
    `id` INT UNSIGNED NOT NULL,
    `consent` TINYINT UNSIGNED,
    `consent_reason` TEXT,
    `updated_at` DATETIME NOT NULL,
    `updater_id` INT UNSIGNED NOT NULL,

    PRIMARY KEY (`id`),
    FOREIGN KEY (`id`)
        REFERENCES `users` (`id`),
    FOREIGN KEY (`updater_id`)
        REFERENCES `users` (`id`)
);

CREATE TABLE `mapper_consent_beatmapsets` (
    `beatmapset_id` INT UNSIGNED NOT NULL,
    `user_id` INT UNSIGNED NOT NULL,
    `consent` BOOLEAN NOT NULL,
    `consent_reason` TEXT,

    PRIMARY KEY (`beatmapset_id`, `user_id`),
    FOREIGN KEY (`beatmapset_id`)
        REFERENCES `beatmapsets` (`id`),
    FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`)
);
