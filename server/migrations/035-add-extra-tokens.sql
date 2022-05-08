CREATE TABLE `extra_tokens` (
    `user_id` INT UNSIGNED NOT NULL,
    `token` TEXT NOT NULL,

    PRIMARY KEY (`user_id`),
    FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`)
);
