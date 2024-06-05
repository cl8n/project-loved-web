-- Increment the type of all nomination assignees. Currently, the enum is
-- 0-indexed, but it needs to be 1-indexed for MySQL to convert it into a real
-- enum column and preserve the correct values.
--
-- This is done in two statements to avoid violating the unique key constraint.
UPDATE `nomination_assignees`
	SET `type` = 2
	WHERE `type` = 1;
UPDATE `nomination_assignees`
	SET `type` = 1
	WHERE `type` = 0;

ALTER TABLE `nomination_assignees`
	MODIFY COLUMN `type` ENUM('metadata', 'moderator', 'news_editor') NOT NULL;
