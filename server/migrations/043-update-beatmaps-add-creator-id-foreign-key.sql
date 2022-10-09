ALTER TABLE `beatmaps`
    ADD FOREIGN KEY (`creator_id`)
        REFERENCES `users` (`id`);
