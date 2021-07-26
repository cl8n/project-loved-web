ALTER TABLE `nominations`
    ADD `order` TINYINT UNSIGNED NOT NULL AFTER `nominator_id`,
    ADD KEY (`order`);
