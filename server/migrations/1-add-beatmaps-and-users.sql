CREATE TABLE `beatmaps` (
    `id` INT UNSIGNED NOT NULL,
    `beatmapset_id` INT UNSIGNED NOT NULL,
    `bpm` DECIMAL(6, 2) NOT NULL,
    `game_mode` TINYINT UNSIGNED NOT NULL,
    `key_count` TINYINT UNSIGNED,
    `play_count` INT UNSIGNED NOT NULL,
    `star_rating` DECIMAL(6, 2) NOT NULL,
    `version` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id`),
    FOREIGN KEY (`beatmapset_id`)
        REFERENCES `beatmapsets` (`id`)
);

CREATE TABLE `beatmapsets` (
    `id` INT UNSIGNED NOT NULL,
    `api_fetched_at` DATETIME NOT NULL,
    `artist` VARCHAR(255) NOT NULL,
    `created_at` DATETIME NOT NULL,
    `creator_id` INT UNSIGNED NOT NULL,
    `creator_name` VARCHAR(255) NOT NULL,
    `favorite_count` MEDIUMINT UNSIGNED NOT NULL,
    `play_count` INT UNSIGNED NOT NULL,
    `ranked_status` TINYINT UNSIGNED NOT NULL,
    `submitted_at` DATETIME NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `updated_at` DATETIME NOT NULL,

    PRIMARY KEY (`id`),
    FOREIGN KEY (`creator_id`)
        REFERENCES `users` (`id`)
);

CREATE TABLE `beatmapset_creators` (
    `beatmapset_id` INT UNSIGNED NOT NULL,
    `creator_id` INT UNSIGNED NOT NULL,
    `game_mode` TINYINT UNSIGNED NOT NULL,

    PRIMARY KEY (`beatmapset_id`, `creator_id`, `game_mode`),
    FOREIGN KEY (`beatmapset_id`)
        REFERENCES `beatmapsets` (`id`),
    FOREIGN KEY (`creator_id`)
        REFERENCES `users` (`id`)
);

CREATE TABLE `users` (
    `id` INT UNSIGNED NOT NULL,
    `api_fetched_at` DATETIME NOT NULL,
    `avatar_url` VARCHAR(255) NOT NULL,
    `banned` BOOLEAN NOT NULL,
    `country` CHAR(2) NOT NULL,
    `name` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id`)
);
