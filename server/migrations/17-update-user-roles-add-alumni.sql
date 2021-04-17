ALTER TABLE `user_roles`
    ADD `alumni` BOOLEAN NOT NULL DEFAULT 0 AFTER `id`,
    ADD `alumni_game_mode` TINYINT UNSIGNED AFTER `alumni`;
