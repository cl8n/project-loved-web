ALTER TABLE `rounds`
    ADD `ignore_moderator_checks` BOOLEAN NOT NULL DEFAULT 0 AFTER `done`;
