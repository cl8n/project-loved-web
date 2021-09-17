ALTER TABLE `mapper_consents`
    RENAME COLUMN `id` TO `user_id`;

ALTER TABLE `poll_results`
    RENAME TO `polls`,
    RENAME COLUMN `round` TO `round_id`,
    DROP KEY `round`,
    ADD UNIQUE KEY (`round_id`, `game_mode`, `beatmapset_id`);

ALTER TABLE `reviews`
    CHANGE COLUMN `captain_id` `reviewer_id` INT UNSIGNED NOT NULL AFTER `reviewed_at`,
    DROP FOREIGN KEY `reviews_ibfk_2`,
    DROP KEY `captain_id`,
    ADD FOREIGN KEY (`reviewer_id`)
        REFERENCES `users` (`id`);

ALTER TABLE `user_names`
    RENAME COLUMN `id` TO `user_id`;

ALTER TABLE `user_roles`
    RENAME COLUMN `id` TO `user_id`;
