#
# Before running this script, stop the APM daemon, flush the system cache and make sure there are no
# jobs in 'waiting' state
#


#
# RUN:
#   migrate_edition_sources
#   migrate_docs
#
DROP TABLE  `ap_edition_sources`;
#DROP TABLE `ap_docs`;

ALTER TABLE apm.ap_pages DROP FOREIGN KEY ap_pages_ibfk_1;

UPDATE `ap_pages` set `type`=`type`+9300 where type < 4;
ALTER TABLE `ap_pages` CHANGE `lang` `lang` VARCHAR(8) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT 'la';

UPDATE `ap_pages` set `lang`='20001' where `lang`='ar';
UPDATE `ap_pages` set `lang`='20002' where `lang`='he';
UPDATE `ap_pages` set `lang`='20003' where `lang`='la';
UPDATE `ap_pages` set `lang`='20004' where `lang`='jrb';

ALTER TABLE `ap_pages` MODIFY `lang` BIGINT NOT NULL DEFAULT 20003;
ALTER TABLE apm.ap_pages DROP FOREIGN KEY ap_pages_ibfk_2;
ALTER TABLE `ap_pages` MODIFY `doc_id` BIGINT;



UPDATE `ap_settings` SET `value` = '37' WHERE `ap_settings`.`setting` = 'DatabaseVersion';