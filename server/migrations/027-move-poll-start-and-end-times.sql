ALTER TABLE `polls`
    MODIFY COLUMN `result_no` INT UNSIGNED,
    MODIFY COLUMN `result_yes` INT UNSIGNED,
    ADD COLUMN `started_at` DATETIME NOT NULL DEFAULT '1970-01-01 00:00:01' AFTER `round_id`;

ALTER TABLE `polls`
    ALTER COLUMN `started_at` DROP DEFAULT;

ALTER TABLE `rounds`
    DROP COLUMN `polls_ended_at`,
    DROP COLUMN `polls_started_at`;
