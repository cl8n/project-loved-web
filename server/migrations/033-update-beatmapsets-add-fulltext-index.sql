ALTER TABLE `beatmapsets`
    ADD FULLTEXT INDEX (`artist`, `creator_name`, `title`);
