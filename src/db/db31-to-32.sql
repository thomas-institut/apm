--
-- DB version 31 to 32
--

-- BEFORE migrating to DB version 32 stop all APM operations (apache, apmd, opensearch)  and
-- do a complete database backup

-- Change database version setting name
UPDATE `ap_settings` SET `setting` = 'DatabaseVersion' WHERE `ap_settings`.`setting` = 'dbversion';

-- Add tids to people, works and edition sources
ALTER TABLE `ap_people` ADD `tid` BIGINT UNSIGNED DEFAULT 0 AFTER `id`;
ALTER TABLE `ap_people` ADD INDEX(`tid`);
ALTER TABLE `ap_works` ADD `tid` BIGINT UNSIGNED DEFAULT 0 AFTER `id`;
ALTER TABLE `ap_works` ADD INDEX (`tid`);
ALTER TABLE `ap_edition_sources` ADD `tid` BIGINT UNSIGNED DEFAULT 0 AFTER `id`;
ALTER TABLE `ap_edition_sources` ADD INDEX (`tid`);
--
-- RUN: generate_tids doIt
--

-- use new people tids in the users table too
ALTER TABLE `ap_users` ADD `tid` BIGINT UNSIGNED DEFAULT 0 AFTER `id`;
UPDATE  `ap_users`, `ap_people` SET `ap_users`.`tid` = `ap_people`.`tid` where `ap_users`.`id`=`ap_people`.`id`;
ALTER TABLE `ap_users` DROP FOREIGN KEY fk_user_people;
ALTER TABLE `ap_users` DROP COLUMN token;
ALTER TABLE `ap_users` ADD INDEX(`tid`);
ALTER TABLE `ap_users`
    ADD CONSTRAINT `fk_user_people` FOREIGN KEY (`tid`) REFERENCES `ap_people` (`tid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- use new people tids for work's authors
ALTER TABLE `ap_works` ADD `author_tid` BIGINT UNSIGNED DEFAULT 0 AFTER `author_id`;
UPDATE  `ap_works`, `ap_people` SET `ap_works`.`author_tid` = `ap_people`.`tid` where `ap_works`.`author_id`=`ap_people`.`id`;
ALTER TABLE `ap_works` ADD INDEX (`author_tid`);
ALTER TABLE `ap_works` DROP FOREIGN KEY `ap_works_ibfk_1`;
ALTER TABLE `ap_works`
    ADD CONSTRAINT `ap_works_ibfk_1` FOREIGN KEY (`author_tid`) REFERENCES `ap_people` (`tid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- use new people tids for editorial note authors
ALTER TABLE `ap_ednotes` ADD `author_tid` BIGINT UNSIGNED DEFAULT 0 AFTER `author_id`;
UPDATE  `ap_ednotes`, `ap_people` SET `ap_ednotes`.`author_tid` = `ap_people`.`tid` where `ap_ednotes`.`author_id`=`ap_people`.`id`;
ALTER TABLE `ap_ednotes` ADD INDEX (`author_tid`);
ALTER TABLE `ap_ednotes` DROP FOREIGN KEY `ap_ednotes_ibfk_1`;
ALTER TABLE `ap_ednotes`
    ADD CONSTRAINT `ap_ednotes_ibfk_1` FOREIGN KEY (`author_tid`) REFERENCES `ap_people` (`tid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- use new people tids for element editors
ALTER TABLE ap_elements ADD `editor_tid` BIGINT UNSIGNED DEFAULT 0 AFTER `editor_id`;
-- the next line will take a while!
UPDATE  `ap_elements`, `ap_people` SET `ap_elements`.`editor_tid` = `ap_people`.`tid` where `ap_elements`.`editor_id`=`ap_people`.`id`;
ALTER TABLE `ap_elements` ADD INDEX (`editor_tid`);
ALTER TABLE `ap_elements` DROP FOREIGN KEY `ap_elements_ibfk_2`;
ALTER TABLE `ap_elements`
    ADD CONSTRAINT `ap_elements_ibfk_2` FOREIGN KEY (`editor_tid`) REFERENCES `ap_people` (`tid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- use new people tids for multi-chunk edition  authors
ALTER TABLE `ap_mc_editions` ADD `author_tid` BIGINT UNSIGNED DEFAULT 0 AFTER `author_id`;
UPDATE  `ap_mc_editions`, `ap_people` SET `ap_mc_editions`.`author_tid` = `ap_people`.`tid` where `ap_mc_editions`.`author_id`=`ap_people`.`id`;
ALTER TABLE `ap_mc_editions` ADD INDEX (`author_tid`);
ALTER TABLE `ap_mc_editions` DROP FOREIGN KEY `ap_mc_editions_author`;
ALTER TABLE `ap_mc_editions`
    ADD CONSTRAINT `ap_mc_editions_author` FOREIGN KEY (`author_tid`) REFERENCES `ap_people` (`tid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- use new people tids for preset users
ALTER TABLE `ap_presets` ADD `user_tid` BIGINT UNSIGNED DEFAULT 0 AFTER `user_id`;
UPDATE  `ap_presets`, `ap_people` SET `ap_presets`.`user_tid` = `ap_people`.`tid` where `ap_presets`.`user_id`=`ap_people`.`id`;
ALTER TABLE `ap_presets` ADD INDEX (`user_tid`);
ALTER TABLE `ap_presets` DROP FOREIGN KEY `ap_presets_useridfk`;
ALTER TABLE `ap_presets`
    ADD CONSTRAINT `ap_presets_useridfk` FOREIGN KEY (`user_tid`) REFERENCES `ap_people` (`tid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- use new people tids for relations
ALTER TABLE `ap_relations` ADD `user_tid` BIGINT UNSIGNED DEFAULT 0 AFTER `userId`;
UPDATE  `ap_relations`, `ap_people` SET `ap_relations`.`user_tid` = `ap_people`.`tid` where `ap_relations`.`userId`=`ap_people`.`id`;
ALTER TABLE `ap_relations` ADD INDEX (`user_tid`);
ALTER TABLE `ap_relations` DROP FOREIGN KEY `fk_userid`;
ALTER TABLE `ap_relations`
    ADD CONSTRAINT `fk_userid` FOREIGN KEY (`user_tid`) REFERENCES `ap_people` (`tid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- use new people tids for token users
ALTER TABLE `ap_tokens` ADD `user_tid` BIGINT UNSIGNED DEFAULT 0 AFTER `user_id`;
UPDATE  `ap_tokens`, `ap_people` SET `ap_tokens`.`user_tid` = `ap_people`.`tid` where `ap_tokens`.`user_id`=`ap_people`.`id`;
ALTER TABLE `ap_tokens` ADD INDEX (`user_tid`);
ALTER TABLE `ap_tokens` DROP FOREIGN KEY `ap_tokens_ibfk_1`;
ALTER TABLE `ap_tokens`
    ADD CONSTRAINT `ap_tokens_ibfk_1` FOREIGN KEY (`user_tid`) REFERENCES `ap_people` (`tid`) ON DELETE RESTRICT ON UPDATE CASCADE;


-- use new people tids for CT version  authors
ALTER TABLE `ap_versions_ct` ADD `author_tid` BIGINT UNSIGNED DEFAULT 0 AFTER `author_id`;
UPDATE  `ap_versions_ct`, `ap_people` SET `ap_versions_ct`.`author_tid` = `ap_people`.`tid` where `ap_versions_ct`.`author_id`=`ap_people`.`id`;
ALTER TABLE `ap_versions_ct` ADD INDEX (`author_tid`);
ALTER TABLE `ap_versions_ct` DROP FOREIGN KEY `ap_versions_ct_author`;
ALTER TABLE `ap_versions_ct`
    ADD CONSTRAINT `ap_versions_ct_author` FOREIGN KEY (`author_tid`) REFERENCES `ap_people` (`tid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- use new people tids for TX version  authors
ALTER TABLE `ap_versions_tx` ADD `author_tid` BIGINT UNSIGNED DEFAULT 0 AFTER `author_id`;
UPDATE  `ap_versions_tx`, `ap_people` SET `ap_versions_tx`.`author_tid` = `ap_people`.`tid` where `ap_versions_tx`.`author_id`=`ap_people`.`id`;
ALTER TABLE `ap_versions_tx` ADD INDEX (`author_tid`);
ALTER TABLE `ap_versions_tx` DROP FOREIGN KEY `ap_versions_tx_author`;
ALTER TABLE `ap_versions_tx`
    ADD CONSTRAINT `ap_versions_tx_author` FOREIGN KEY (`author_tid`) REFERENCES `ap_people` (`tid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- change current author ids in notes saved within collation tables to new author tids
--
-- RUN migrate_author_ids doIt  (this will take a while!)
--


-- change current uuid references to sources to new edition sources tids
--
-- RUN migrate_edition_sources doIt
--

-- clean up the multi-chunk editions table


-- clean up the edition sources table
ALTER TABLE `ap_edition_sources` DROP COLUMN `uuid`;
ALTER TABLE `ap_edition_sources` MODIFY COLUMN `id` int NOT NULL AUTO_INCREMENT;

-- add tags and email address columns to user's table
ALTER TABLE `ap_users` ADD `tags` VARCHAR(1024) DEFAULT  '' AFTER `password`;
UPDATE `ap_users` SET `tags` = 'disabled' WHERE `password` IS NULL;
UPDATE `ap_users` SET `tags` = 'root' WHERE `username`='rafael';
UPDATE `ap_users` SET `tags` = 'readOnly' WHERE `username`='guest';
ALTER TABLE `ap_users` ADD `email_address` VARCHAR(1024) DEFAULT NULL UNIQUE AFTER `password`;
UPDATE `ap_users`, `ap_people` SET `ap_users`.`email_address`=`ap_people`.`email` WHERE `ap_users`.`tid` = `ap_people`.tid;

-- clean up people table: fullname becomes name, add sort_name to the people table and drop email
ALTER TABLE `ap_people` CHANGE COLUMN `fullname` `name` VARCHAR(1024) NOT NULL;
ALTER TABLE `ap_people` ADD `sort_name` VARCHAR(1024) DEFAULT NULL AFTER `name`;
ALTER TABLE `ap_people` ADD `slug` VARCHAR(1024) DEFAULT NULL AFTER `sort_name`;
ALTER TABLE `ap_people` DROP COLUMN `email`;

-- Generate slugs and sort names
-- RUN: generate_slugs doIt


-- Let MySql handle the id column in ap_works
ALTER TABLE `ap_works` MODIFY COLUMN `id` int NOT NULL AUTO_INCREMENT;

-- drop unused tables
DROP TABLE ap_scheduler;

-- clean up token table
ALTER TABLE `ap_tokens` MODIFY COLUMN `id` int NOT NULL AUTO_INCREMENT;
ALTER TABLE `ap_tokens` DROP COLUMN `user_id`;
DELETE FROM ap_tokens where creation_time < '2023-12-11';

-- get rid of person id columns
ALTER TABLE `ap_ednotes` DROP COLUMN `author_id`;
ALTER TABLE `ap_elements` DROP COLUMN `editor_id`;
ALTER TABLE `ap_mc_editions` DROP COLUMN `author_id`;
ALTER TABLE `ap_presets` DROP COLUMN  `user_id`;
ALTER TABLE `ap_relations` DROP COLUMN `userId`;
ALTER TABLE `ap_versions_ct` DROP COLUMN `author_id`;
ALTER TABLE `ap_versions_tx` DROP COLUMN `author_id`;
ALTER TABLE `ap_works` DROP COLUMN `author_id`;

-- allow longer usernames
ALTER TABLE `ap_users` MODIFY COLUMN `username` VARCHAR(128) NOT NULL;

-- reset system cache
TRUNCATE `ap_system_cache`;

-- Convert all database TimeString fields to UTC : this will take a very long time
-- RUN: convert_time_strings doIt

-- Make time for editorial notes a TimeString
ALTER TABLE `ap_ednotes` MODIFY COLUMN `time` datetime(6) NOT NULL;


-- Add a slug to people table


-- Finally, update version number
UPDATE `ap_settings` SET `value` = '32' WHERE `ap_settings`.`setting` = 'DatabaseVersion';