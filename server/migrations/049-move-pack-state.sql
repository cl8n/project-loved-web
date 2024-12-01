ALTER TABLE `round_game_modes`
	ADD COLUMN `pack_state` TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER `nominations_locked`;

-- Move pack state into each game mode
UPDATE `round_game_modes`
	INNER JOIN `rounds`
		ON `round_game_modes`.`round_id` = `rounds`.`id`
	SET `round_game_modes`.`pack_state` = `rounds`.`packs_state`;

ALTER TABLE `rounds`
	DROP COLUMN `packs_state`;
