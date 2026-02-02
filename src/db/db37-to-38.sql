#
# Before running this script, stop the APM daemon, flush the system cache and make sure there are no
# jobs in 'waiting' state
#

DROP TABLE IF EXISTS `ap_scope_documents`;
DROP TABLE IF EXISTS `ap_scope_users`;
DROP TABLE IF EXISTS `ap_scopes`;

CREATE TABLE `ap_scopes` (
    `id` int NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `name` varchar(128) NOT NULL,
    UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE `ap_scope_users` (
    `scope_id` int NOT NULL,
    `user_id` bigint NOT NULL,
    PRIMARY KEY (`scope_id`, `user_id`),
    INDEX `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE `ap_scope_documents` (
    `scope_id` int NOT NULL,
    `document_id` bigint NOT NULL,
    PRIMARY KEY (`scope_id`, `document_id`),
    INDEX `document_id` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

UPDATE `ap_settings` SET `value` = '38' WHERE `ap_settings`.`setting` = 'DatabaseVersion';
