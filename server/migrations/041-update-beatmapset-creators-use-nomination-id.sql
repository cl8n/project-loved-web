ALTER TABLE `beatmapset_creators`
    RENAME TO `beatmapset_creators_old`;

CREATE TABLE `beatmapset_creators` (
    `creator_id` INT UNSIGNED NOT NULL,
    `nomination_id` MEDIUMINT UNSIGNED NOT NULL,

    PRIMARY KEY (`nomination_id`, `creator_id`),
    FOREIGN KEY (`creator_id`)
        REFERENCES `users` (`id`),
    FOREIGN KEY (`nomination_id`)
        REFERENCES `nominations` (`id`)
);

INSERT INTO `beatmapset_creators`
    SELECT `beatmapset_creators_old`.`creator_id`, `nominations`.`id`
    FROM `beatmapset_creators_old`
    INNER JOIN `nominations`
        ON `beatmapset_creators_old`.`beatmapset_id` = `nominations`.`beatmapset_id`
            AND `beatmapset_creators_old`.`game_mode` = `nominations`.`game_mode`;

DROP TABLE `beatmapset_creators_old`;
