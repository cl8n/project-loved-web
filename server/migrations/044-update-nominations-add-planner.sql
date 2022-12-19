ALTER TABLE `nominations`
    ADD COLUMN `category` VARCHAR(255) AFTER `beatmapset_id`,
    MODIFY COLUMN `round_id` MEDIUMINT UNSIGNED;
