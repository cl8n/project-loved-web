CREATE TABLE `submissions` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `beatmapset_id` INT UNSIGNED NOT NULL,
    `game_mode` TINYINT UNSIGNED NOT NULL,
    `reason` TEXT,
    `submitted_at` DATETIME,
    `submitter_id` INT UNSIGNED,

    PRIMARY KEY (`id`),
    UNIQUE KEY (`game_mode`, `beatmapset_id`, `submitter_id`),
    FOREIGN KEY (`beatmapset_id`)
        REFERENCES `beatmapsets` (`id`),
    FOREIGN KEY (`submitter_id`)
        REFERENCES `users` (`id`),
    KEY (`submitted_at`)
);

CREATE TABLE `reviews` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `beatmapset_id` INT UNSIGNED NOT NULL,
    `captain_id` INT UNSIGNED NOT NULL,
    `game_mode` TINYINT UNSIGNED NOT NULL,
    `reason` TEXT NOT NULL,
    `reviewed_at` DATETIME NOT NULL,
    `score` TINYINT NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY (`game_mode`, `beatmapset_id`, `captain_id`),
    FOREIGN KEY (`beatmapset_id`)
        REFERENCES `beatmapsets` (`id`),
    FOREIGN KEY (`captain_id`)
        REFERENCES `users` (`id`),
    KEY (`reviewed_at`)
);
