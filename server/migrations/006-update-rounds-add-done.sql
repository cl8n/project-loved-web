ALTER TABLE `rounds`
    ADD `done` BOOLEAN NOT NULL DEFAULT 0 AFTER `id`,
    ADD KEY (`done`);
