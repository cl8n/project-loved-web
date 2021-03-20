ALTER TABLE `beatmapsets`
    DROP `created_at`,
    MODIFY `ranked_status` TINYINT NOT NULL;

ALTER TABLE `beatmaps`
    ADD `deleted_at` DATETIME AFTER `bpm`,
    ADD `ranked_status` TINYINT NOT NULL AFTER `play_count`;
