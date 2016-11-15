--
-- SQL code to migrate the Averroes DB from 0.01 to 0.02
-- 
-- Created 2016-11-09
--
--  ATTENTION: backup the database before runnning this code!
--
ALTER TABLE `ap_elements` ADD `did` INT NOT NULL AFTER `doc_id`;
UPDATE `ap_elements` SET `did`=(SELECT `id` FROM `ap_docs` WHERE `ap_docs`.`image_source_data`=`ap_elements`.`doc_id`);
ALTER TABLE `ap_elements` DROP `doc_id`;
ALTER TABLE `ap_elements` CHANGE `did` `doc_id` INT(11) NOT NULL;
UPDATE `ap_settings` SET `value`='0.02' WHERE `key`='dbversion';