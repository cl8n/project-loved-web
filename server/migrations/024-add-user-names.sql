CREATE TABLE `user_names` (
    `id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id`, `name`),
    FOREIGN KEY (`id`)
        REFERENCES `users` (`id`),
    KEY (`name`)
);
