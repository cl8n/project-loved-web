CREATE TABLE `nomination_nominators` (
    `nomination_id` MEDIUMINT UNSIGNED NOT NULL,
    `nominator_id` INT UNSIGNED NOT NULL,

    PRIMARY KEY (`nomination_id`, `nominator_id`),
    FOREIGN KEY (`nomination_id`)
        REFERENCES `nominations` (`id`),
    FOREIGN KEY (`nominator_id`)
        REFERENCES `users` (`id`)
);
