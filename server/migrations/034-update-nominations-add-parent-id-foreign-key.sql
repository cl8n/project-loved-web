ALTER TABLE `nominations`
    ADD FOREIGN KEY (`parent_id`)
        REFERENCES `nominations` (`id`);
