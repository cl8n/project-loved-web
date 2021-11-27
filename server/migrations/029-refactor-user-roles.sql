ALTER TABLE `user_roles`
    RENAME TO `user_roles_old`;

CREATE TABLE `user_roles` (
    `game_mode` TINYINT NOT NULL DEFAULT -1,
    `role_id` TINYINT UNSIGNED NOT NULL,
    `user_id` INT UNSIGNED NOT NULL,
    `alumni` BOOLEAN NOT NULL DEFAULT 0,

    PRIMARY KEY (`user_id`, `role_id`, `game_mode`),
    FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`)
);

INSERT INTO `user_roles`
    SELECT -1, 0, `user_id`, 0
    FROM `user_roles_old`
    WHERE `god` = 1;

INSERT INTO `user_roles`
    SELECT `captain_game_mode`, 1, `user_id`, 0
    FROM `user_roles_old`
    WHERE `captain` = 1 AND `captain_game_mode` IS NOT NULL;

INSERT INTO `user_roles`
    SELECT `alumni_game_mode`, 1, `user_id`, 1
    FROM `user_roles_old`
    WHERE `alumni` = 1 AND `alumni_game_mode` IS NOT NULL;

INSERT INTO `user_roles`
    SELECT -1, 2, `user_id`, 0
    FROM `user_roles_old`
    WHERE `metadata` = 1;

INSERT INTO `user_roles`
    SELECT -1, 3, `user_id`, 0
    FROM `user_roles_old`
    WHERE `moderator` = 1;

INSERT INTO `user_roles`
    SELECT -1, 4, `user_id`, 0
    FROM `user_roles_old`
    WHERE `news` = 1;

INSERT INTO `user_roles`
    SELECT -1, 5, `user_id`, 0
    FROM `user_roles_old`
    WHERE `dev` = 1;

INSERT INTO `user_roles`
    SELECT -1, 6, `user_id`, 0
    FROM `user_roles_old`
    WHERE `god_readonly` = 1;

INSERT INTO `user_roles`
    SELECT -1, 7, `user_id`, 1
    FROM `user_roles_old`
    WHERE `alumni` = 1 AND `alumni_game_mode` IS NULL;

DROP TABLE `user_roles_old`;
