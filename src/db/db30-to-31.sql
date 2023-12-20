ALTER TABLE `ap_docs` ADD `public` TINYINT NOT NULL DEFAULT '1' AFTER `doc_type`;
ALTER TABLE `ap_docs` ADD `in_dare` TINYINT NOT NULL DEFAULT '1' AFTER `doc_type`;
ALTER TABLE `ap_docs` ADD `deep_zoom` TINYINT NOT NULL DEFAULT '0' AFTER `image_source_data`;
ALTER TABLE `ap_docs` DROP COLUMN `short_title`;

UPDATE `ap_docs` set image_source='bilderberg' WHERE image_source='dare';
UPDATE `ap_docs` SET ap_docs.deep_zoom=1 where image_source='dare-deepzoom';
UPDATE `ap_docs` set ap_docs.in_dare=0 WHERE image_source='local';
UPDATE `ap_docs` set ap_docs.public=0 WHERE image_source='local';
UPDATE `ap_docs` set image_source='bilderberg' WHERE image_source='dare-deepzoom';
UPDATE `ap_docs` set image_source='averroes-server' WHERE image_source='local';

UPDATE `ap_settings` SET `value` = '31' WHERE `ap_settings`.`setting` = 'dbversion';