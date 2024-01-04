ALTER TABLE `ap_people` ADD `tid` BIGINT UNSIGNED DEFAULT 0 AFTER `id`;

UPDATE `ap_settings` SET `value` = '32' WHERE `ap_settings`.`setting` = 'dbversion';