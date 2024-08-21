ALTER TABLE `rounds`
	ADD `ignore_packs_checks` BOOLEAN NOT NULL DEFAULT 0 AFTER `ignore_news_editor_assignees`,
	ADD `packs_state` TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER `news_posted_at`;
