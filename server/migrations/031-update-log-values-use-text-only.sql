ALTER TABLE `log_values`
    DROP COLUMN `value_int`,
    RENAME COLUMN `value_text` TO `value`;
