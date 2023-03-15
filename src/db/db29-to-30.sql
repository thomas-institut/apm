DROP TABLE IF EXISTS `ap_system_cache`;
CREATE TABLE `ap_system_cache` (
    `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `cache_key` varchar(512) NOT NULL UNIQUE KEY,
    `value` longblob,
    `set_at` datetime(6)  NOT NULL,
    `expires` datetime(6)  NOT NULL DEFAULT '9999-12-31 23:59:59.999999'
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

UPDATE `ap_settings` SET `value` = '30' WHERE `ap_settings`.`setting` = 'dbversion';
