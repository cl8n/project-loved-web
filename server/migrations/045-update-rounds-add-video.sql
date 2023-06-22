ALTER TABLE `rounds`
    ADD COLUMN `video` VARCHAR(255) AFTER `news_posted_at`;

ALTER TABLE `round_game_modes`
    ADD COLUMN `video` VARCHAR(255) AFTER `results_post_id`;
