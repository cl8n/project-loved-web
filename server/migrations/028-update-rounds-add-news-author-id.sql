ALTER TABLE `rounds`
    ADD `news_author_id` INT UNSIGNED NOT NULL AFTER `name`;

-- Random default that will make it obvious it needs to be updated
UPDATE `rounds` SET `news_author_id` = 3;

ALTER TABLE `rounds`
    ADD FOREIGN KEY (`news_author_id`)
        REFERENCES `users` (`id`);
