CREATE TABLE `logs` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `created_at` DATETIME NOT NULL,
    `type` SMALLINT UNSIGNED NOT NULL,

    PRIMARY KEY (`id`)
);

CREATE TABLE `log_values` (
    `log_id` INT UNSIGNED NOT NULL,
    `parameter` TINYINT UNSIGNED NOT NULL,
    `value_int` INT,
    `value_text` TEXT,

    PRIMARY KEY (`log_id`, `parameter`),
    FOREIGN KEY (`log_id`)
        REFERENCES `logs` (`id`)
);
