ALTER TABLE `polls`
    ADD FOREIGN KEY (`round_id`)
        REFERENCES `rounds` (`id`);
