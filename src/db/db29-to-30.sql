DROP TABLE IF EXISTS `ap_system_cache`;
CREATE TABLE `ap_system_cache` (
    `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `cache_key` varchar(512) NOT NULL UNIQUE KEY,
    `value` longblob,
    `set_at` datetime(6)  NOT NULL,
    `expires` datetime(6)  NOT NULL DEFAULT '9999-12-31 23:59:59.999999'
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


DROP TABLE IF EXISTS `ap_jobs`;
CREATE TABLE `ap_jobs` (
   `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
   `name` varchar(512) NOT NULL,
   `payload` longblob,
   `state` varchar(32) default 'waiting',
   `scheduled_at` datetime(6)  NOT NULL,
   `max_attempts` int default 1,
   `secs_between_retries` int default 5,
   `completed_runs` int default 0,
   `last_run_at` datetime(6) DEFAULT NULL,
   `next_retry_at` datetime(6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

UPDATE `ap_settings` SET `value` = '30' WHERE `ap_settings`.`setting` = 'dbversion';
