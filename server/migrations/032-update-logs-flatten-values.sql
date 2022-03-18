DROP TABLE `log_values`;

ALTER TABLE `logs`
    ADD `values` TEXT AFTER `type`;
