ALTER TABLE `rounds`
	ADD `ignore_news_editor_assignees` BOOLEAN NOT NULL DEFAULT 0 AFTER `ignore_moderator_checks`;
