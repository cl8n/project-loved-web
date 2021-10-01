ALTER TABLE `rounds`
    ADD `news_author_id` INT UNSIGNED NOT NULL AFTER `name`,
    ADD FOREIGN KEY (`news_author_id`)
        REFERENCES `users` (`id`);
