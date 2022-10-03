CREATE TABLE `interop_keys` (
    `key` CHAR(64) NOT NULL,
    `user_id` INT UNSIGNED NOT NULL,

    PRIMARY KEY (`key`),
    FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`)
);
