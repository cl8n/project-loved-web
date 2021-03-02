CREATE TABLE `nominations` (
    `id` MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `beatmapset_id` INT UNSIGNED NOT NULL,
    `description` TEXT,
    `description_author_id` INT UNSIGNED,
    `description_state` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `game_mode` TINYINT UNSIGNED NOT NULL,
    `metadata_assignee_id` INT UNSIGNED,
    `metadata_state` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `moderator_assignee_id` INT UNSIGNED,
    `moderator_state` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `nominator_id` INT UNSIGNED NOT NULL,
    `overwrite_artist` VARCHAR(255),
    `overwrite_title` VARCHAR(255),
    `parent_id` MEDIUMINT UNSIGNED,
    `round_id` MEDIUMINT UNSIGNED NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY (`round_id`, `game_mode`, `beatmapset_id`),
    FOREIGN KEY (`beatmapset_id`)
        REFERENCES `beatmapsets` (`id`),
    FOREIGN KEY (`description_author_id`)
        REFERENCES `users` (`id`),
    FOREIGN KEY (`metadata_assignee_id`)
        REFERENCES `users` (`id`),
    FOREIGN KEY (`moderator_assignee_id`)
        REFERENCES `users` (`id`),
    FOREIGN KEY (`nominator_id`)
        REFERENCES `users` (`id`),
    FOREIGN KEY (`round_id`)
        REFERENCES `rounds` (`id`)
);

CREATE TABLE `rounds` (
    `id` MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `polls_ended_at` DATETIME,
    `polls_started_at` DATETIME,
    `name` VARCHAR(255) NOT NULL,
    `news_intro` TEXT,
    `news_intro_preview` TEXT,
    `news_posted_at` DATETIME,

    PRIMARY KEY (`id`)
);
