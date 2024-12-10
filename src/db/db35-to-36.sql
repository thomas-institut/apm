#
# Before running this script, stop the APM daemon, flush the system cache and make sure there are no
# jobs in 'waiting' state
#

# Fixes Pasquale Porro's problem!
ALTER TABLE apm.ap_versions_ct DROP FOREIGN KEY ap_versions_ct_author;

# Other table relations that depend on the deprecated ap_people table

ALTER TABLE apm.ap_elements DROP FOREIGN KEY ap_elements_ibfk_2;
ALTER TABLE apm.ap_ednotes DROP FOREIGN KEY ap_ednotes_ibfk_1;
ALTER TABLE apm.ap_mc_editions DROP FOREIGN KEY ap_mc_editions_author;
ALTER TABLE apm.ap_presets DROP FOREIGN KEY ap_presets_useridfk;
ALTER TABLE apm.ap_relations DROP FOREIGN KEY fk_userid;
ALTER TABLE apm.ap_tokens DROP FOREIGN KEY ap_user_id;
ALTER TABLE apm.ap_versions_tx DROP FOREIGN KEY ap_versions_tx_author;
ALTER TABLE apm.ap_works DROP FOREIGN KEY ap_works_ibfk_1;

# ap_users now use entity id as row ids
ALTER TABLE `ap_users` CHANGE `id` `id` BIGINT NOT NULL;
UPDATE `ap_users` SET `id` = `tid`;
ALTER TABLE `ap_users` DROP COLUMN `tid`;


# Sessions and session log tables
DROP TABLE IF EXISTS `ap_sessions_register`;
CREATE TABLE `ap_sessions_register` (
                            `id` int NOT NULL PRIMARY KEY AUTO_INCREMENT,
                            `session_id` bigint NOT NULL ,
                            `user_id` bigint NOT NULL,
                            `is_open` tinyint not null,
                            `data` longtext,
                            INDEX `session_id` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

DROP TABLE IF EXISTS `ap_sessions_log`;
CREATE TABLE `ap_sessions_log` (
                               `id` int NOT NULL PRIMARY KEY AUTO_INCREMENT,
                                `session_id` bigint NOT NULL,
                               `time` datetime(6) NOT NULL,
                               `source` varchar(20) NOT NULL,
                                `msg` varchar(1024) NOT NULL,
                                `extra_data` JSON,
                               INDEX `session_id` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;



UPDATE `ap_settings` SET `value` = '36' WHERE `ap_settings`.`setting` = 'DatabaseVersion';