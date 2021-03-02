CREATE TABLE `user_roles` (
    `id` INT UNSIGNED NOT NULL,
    `captain` BOOLEAN NOT NULL DEFAULT 0,
    `captain_game_mode` TINYINT UNSIGNED,
    `god` BOOLEAN NOT NULL DEFAULT 0,
    `god_readonly` BOOLEAN NOT NULL DEFAULT 0,
    `metadata` BOOLEAN NOT NULL DEFAULT 0,
    `moderator` BOOLEAN NOT NULL DEFAULT 0,
    `news` BOOLEAN NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`),
    FOREIGN KEY (`id`)
        REFERENCES `users` (`id`),
    KEY (`captain_game_mode`)
);
