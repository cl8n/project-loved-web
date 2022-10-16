UPDATE `beatmaps`
    INNER JOIN `beatmapsets`
        ON `beatmaps`.`beatmapset_id` = `beatmapsets`.`id`
    SET `beatmaps`.`creator_id` = `beatmapsets`.`creator_id`
    WHERE `beatmaps`.`creator_id` = 0;

ALTER TABLE `beatmaps`
    ADD FOREIGN KEY (`creator_id`)
        REFERENCES `users` (`id`);
