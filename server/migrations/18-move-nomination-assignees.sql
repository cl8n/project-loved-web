CREATE TABLE `nomination_assignees` (
    `assignee_id` INT UNSIGNED NOT NULL,
    `nomination_id` MEDIUMINT UNSIGNED NOT NULL,
    `type` TINYINT UNSIGNED NOT NULL,

    PRIMARY KEY (`nomination_id`, `assignee_id`),
    FOREIGN KEY (`assignee_id`)
        REFERENCES `users` (`id`),
    FOREIGN KEY (`nomination_id`)
        REFERENCES `nominations` (`id`)
);

INSERT INTO `nomination_assignees`
    SELECT `metadata_assignee_id`, `id`, 0
    FROM `nominations`
    WHERE `metadata_assignee_id` IS NOT NULL;

INSERT INTO `nomination_assignees`
    SELECT `moderator_assignee_id`, `id`, 1
    FROM `nominations`
    WHERE `moderator_assignee_id` IS NOT NULL;

ALTER TABLE `nominations`
    DROP FOREIGN KEY `nominations_ibfk_3`,
    DROP FOREIGN KEY `nominations_ibfk_4`,
    DROP `metadata_assignee_id`,
    DROP `moderator_assignee_id`;
