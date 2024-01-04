--
-- DB version 31 to 32
--

ALTER TABLE `ap_people` ADD `tid` BIGINT UNSIGNED DEFAULT 0 AFTER `id`;
ALTER TABLE `ap_people` ADD `isApmUser` TINYINT NOT NULL DEFAULT 0 AFTER `email`;
UPDATE `ap_people` SET `isApmUser` = 1 where `id` > 10;
ALTER TABLE `ap_people` ADD INDEX(`tid`);

--  RUN:  generate_people_tids doIt
-- then:

ALTER TABLE `ap_users` ADD `tid` BIGINT UNSIGNED DEFAULT 0 AFTER `id`;
UPDATE  `ap_users`, `ap_people` SET `ap_users`.`tid` = `ap_people`.`tid` where `ap_users`.`id`=`ap_people`.`id`;
ALTER TABLE `ap_users` DROP FOREIGN KEY fk_user_people;
ALTER TABLE `ap_users` DROP COLUMN token;
ALTER TABLE `ap_users` ADD INDEX(`tid`);
ALTER TABLE `ap_users`
    ADD CONSTRAINT `fk_user_people` FOREIGN KEY (`tid`) REFERENCES `ap_people` (`tid`) ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE `ap_edition_sources` ADD `tid` BIGINT UNSIGNED DEFAULT 0 AFTER `id`;

-- RUN: generate_work_tids doIt
-- then:

ALTER TABLE `ap_edition_sources` DROP COLUMN `uuid`;
ALTER TABLE `ap_edition_sources` MODIFY COLUMN `id` int NOT NULL AUTO_INCREMENT;
ALTER TABLE `ap_edition_sources` ADD KEY (`tid`);

ALTER TABLE `ap_works` ADD `tid` BIGINT UNSIGNED DEFAULT 0 AFTER `id`;
ALTER TABLE `ap_works` ADD `author_tid` BIGINT UNSIGNED DEFAULT 0 AFTER `author_id`;
UPDATE  `ap_works`, `ap_people` SET `ap_works`.`author_tid` = `ap_people`.`tid` where `ap_works`.`author_id`=`ap_people`.`id`;
ALTER TABLE `ap_works` ADD INDEX (`tid`);
ALTER TABLE `ap_works` ADD INDEX (`author_tid`);
ALTER TABLE `ap_works` DROP FOREIGN KEY `ap_works_ibfk_1`;
ALTER TABLE `ap_works`
    ADD CONSTRAINT `ap_works_ibfk_1` FOREIGN KEY (`author_tid`) REFERENCES `ap_people` (`tid`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ap_works` MODIFY COLUMN `id` int NOT NULL AUTO_INCREMENT;

-- RUN: migrate_edition_sources doIt
-- then:

UPDATE `ap_settings` SET `value` = '32' WHERE `ap_settings`.`setting` = 'dbversion';