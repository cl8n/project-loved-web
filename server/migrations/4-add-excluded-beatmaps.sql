CREATE TABLE `nomination_excluded_beatmaps` (
    `beatmap_id` INT UNSIGNED NOT NULL,
    `nomination_id` MEDIUMINT UNSIGNED NOT NULL,

    PRIMARY KEY (`beatmap_id`, `nomination_id`),
    FOREIGN KEY (`beatmap_id`)
        REFERENCES `beatmaps` (`id`),
    FOREIGN KEY (`nomination_id`)
        REFERENCES `nominations` (`id`)
);
