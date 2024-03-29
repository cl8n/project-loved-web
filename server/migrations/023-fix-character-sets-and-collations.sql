ALTER DATABASE `project_loved` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;

ALTER TABLE `beatmaps` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;
ALTER TABLE `beatmapset_creators` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;
ALTER TABLE `beatmapsets` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;
ALTER TABLE `log_values` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;
ALTER TABLE `logs` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;
ALTER TABLE `mapper_consent_beatmapsets` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;
ALTER TABLE `mapper_consents` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;
ALTER TABLE `nomination_assignees` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;
ALTER TABLE `nomination_excluded_beatmaps` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;
ALTER TABLE `nomination_nominators` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;
ALTER TABLE `nominations` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;
ALTER TABLE `poll_results` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;
ALTER TABLE `reviews` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;
ALTER TABLE `round_game_modes` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;
ALTER TABLE `rounds` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;
ALTER TABLE `submissions` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;
ALTER TABLE `user_roles` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;
ALTER TABLE `users` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;

-- In case the sessions table hasn't been created by the application yet
-- https://github.com/chill117/express-mysql-session/blob/50008e5b71d884b4b7d1b8bec2a306ea296fdf6c/schema.sql
CREATE TABLE IF NOT EXISTS `sessions` (
    `session_id` VARCHAR(128) NOT NULL,
    `expires` INT(11) UNSIGNED NOT NULL,
    `data` MEDIUMTEXT,

    PRIMARY KEY (`session_id`)
);

-- Binary collation is sufficient for sessions
ALTER TABLE `sessions` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;
