CREATE TABLE `round_game_modes` (
    `round_id` MEDIUMINT UNSIGNED NOT NULL,
    `game_mode` TINYINT UNSIGNED NOT NULL,
    `nominations_locked` BOOLEAN NOT NULL DEFAULT 0,
    `voting_threshold` DECIMAL(2, 2) NOT NULL,

    PRIMARY KEY (`round_id`, `game_mode`),
    FOREIGN KEY (`round_id`)
        REFERENCES `rounds` (`id`)
);
