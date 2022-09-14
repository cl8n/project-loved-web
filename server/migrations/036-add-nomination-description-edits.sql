CREATE TABLE `nomination_description_edits` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `description` TEXT,
    `edited_at` DATETIME NOT NULL,
    `editor_id` INT UNSIGNED NOT NULL,
    `nomination_id` MEDIUMINT UNSIGNED NOT NULL,

    PRIMARY KEY (`id`),
    FOREIGN KEY (`editor_id`)
        REFERENCES `users` (`id`),
    FOREIGN KEY (`nomination_id`)
        REFERENCES `nominations` (`id`),
    KEY (`nomination_id`, `edited_at`)
);
