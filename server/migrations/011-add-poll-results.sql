CREATE TABLE `poll_results` (
    `id` MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `beatmapset_id` INT UNSIGNED NOT NULL,
    `ended_at` DATETIME NOT NULL,
    `game_mode` TINYINT UNSIGNED NOT NULL,
    `result_no` INT UNSIGNED NOT NULL,
    `result_yes` INT UNSIGNED NOT NULL,
    `round` MEDIUMINT UNSIGNED NOT NULL,
    `topic_id` INT UNSIGNED NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY (`round`, `game_mode`, `beatmapset_id`),
    FOREIGN KEY (`beatmapset_id`)
        REFERENCES `beatmapsets` (`id`),
    KEY (`ended_at`)
);
