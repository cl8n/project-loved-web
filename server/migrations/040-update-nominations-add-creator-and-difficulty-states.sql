ALTER TABLE `nominations`
    ADD `creators_state` TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER `beatmapset_id`,
    ADD `difficulties_set` BOOLEAN NOT NULL DEFAULT 0 AFTER `description_state`;

ALTER TABLE `rounds`
    ADD `ignore_creator_and_difficulty_checks` BOOLEAN NOT NULL DEFAULT 0 AFTER `done`;
