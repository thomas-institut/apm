-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: mysql    Database: apm
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `ap_chunks`
--

DROP TABLE IF EXISTS `ap_chunks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_chunks` (
                             `id` int NOT NULL,
                             `dare_id` varchar(5) NOT NULL,
                             `max_chunk_id` int NOT NULL DEFAULT '0',
                             PRIMARY KEY (`id`),
                             KEY `dare_id` (`dare_id`),
                             CONSTRAINT `ap_chunks_ibfk_1` FOREIGN KEY (`dare_id`) REFERENCES `ap_works` (`dare_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ap_ctables`
--

DROP TABLE IF EXISTS `ap_ctables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_ctables` (
                              `id` int NOT NULL,
                              `valid_from` datetime(6) NOT NULL DEFAULT '2020-04-09 00:00:00.000000',
                              `valid_until` datetime(6) NOT NULL DEFAULT '9999-12-31 23:59:59.999999',
                              `chunk_id` varchar(32) NOT NULL,
                              `work_id` varchar(8) NOT NULL DEFAULT '',
                              `chunk_number` int NOT NULL DEFAULT '-1',
                              `type` varchar(16) NOT NULL,
                              `witnesses_json` varchar(4192) NOT NULL,
                              `title` varchar(128) DEFAULT 'NoTitle',
                              `compressed` tinyint NOT NULL DEFAULT '0',
                              `archived` tinyint NOT NULL DEFAULT '0',
                              `data` longblob NOT NULL,
                              PRIMARY KEY (`id`,`valid_from`,`valid_until`),
                              KEY `chunk_id` (`chunk_id`),
                              KEY `apm_id` (`work_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ap_docs`
--

DROP TABLE IF EXISTS `ap_docs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_docs` (
                           `id` int NOT NULL,
                           `tid` bigint unsigned DEFAULT '0',
                           `title` varchar(512) DEFAULT NULL,
                           `lang` varchar(3) DEFAULT 'la',
                           `doc_type` varchar(16) DEFAULT 'mss',
                           `in_dare` tinyint NOT NULL DEFAULT '1',
                           `public` tinyint NOT NULL DEFAULT '1',
                           `image_source` varchar(16) DEFAULT 'local',
                           `image_source_data` varchar(512) DEFAULT NULL,
                           `deep_zoom` tinyint NOT NULL DEFAULT '0',
                           PRIMARY KEY (`id`),
                           KEY `title` (`title`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ap_edition_sources`
--

DROP TABLE IF EXISTS `ap_edition_sources`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_edition_sources` (
                                      `id` int NOT NULL AUTO_INCREMENT,
                                      `tid` bigint unsigned DEFAULT '0',
                                      `title` varchar(256) NOT NULL,
                                      `description` varchar(1024) NOT NULL,
                                      `default_siglum` varchar(8) NOT NULL,
                                      PRIMARY KEY (`id`),
                                      KEY `tid` (`tid`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ap_ednotes`
--

DROP TABLE IF EXISTS `ap_ednotes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_ednotes` (
                              `id` int NOT NULL,
                              `type` int NOT NULL DEFAULT '0',
                              `target` int NOT NULL DEFAULT '0',
                              `lang` varchar(3) DEFAULT 'la',
                              `author_tid` bigint unsigned DEFAULT '0',
                              `time` datetime(6) NOT NULL,
                              `text` varchar(2048) NOT NULL,
                              PRIMARY KEY (`id`),
                              KEY `author_tid` (`author_tid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ap_elements`
--

DROP TABLE IF EXISTS `ap_elements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_elements` (
                               `id` int NOT NULL,
                               `valid_from` datetime(6) NOT NULL DEFAULT '2016-06-01 00:00:00.000000',
                               `valid_until` datetime(6) NOT NULL DEFAULT '9999-12-31 23:59:59.999999',
                               `type` int NOT NULL DEFAULT '0',
                               `page_id` int NOT NULL,
                               `column_number` int NOT NULL DEFAULT '0',
                               `seq` int NOT NULL,
                               `lang` varchar(3) DEFAULT 'la',
                               `editor_tid` bigint unsigned DEFAULT '0',
                               `hand_id` int NOT NULL DEFAULT '0',
                               `reference` int DEFAULT NULL,
                               `placement` varchar(64) DEFAULT NULL,
                               PRIMARY KEY (`id`,`valid_from`,`valid_until`),
                               KEY `hand_id` (`hand_id`),
                               KEY `type` (`type`),
                               KEY `page_id` (`page_id`),
                               KEY `column_number` (`column_number`),
                               KEY `page_id_2` (`page_id`),
                               KEY `editor_tid` (`editor_tid`),
                               CONSTRAINT `ap_elements_ibfk_5` FOREIGN KEY (`page_id`) REFERENCES `ap_pages` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ap_es_default_cache`
--

DROP TABLE IF EXISTS `ap_es_default_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_es_default_cache` (
                                       `id` int NOT NULL AUTO_INCREMENT,
                                       `dataId` varchar(256) DEFAULT NULL,
                                       `setAt` int DEFAULT NULL,
                                       `expires` int DEFAULT NULL,
                                       `tid` bigint NOT NULL,
                                       `type` bigint DEFAULT NULL,
                                       `name` text,
                                       `data` longtext,
                                       PRIMARY KEY (`id`),
                                       KEY `tid` (`dataId`,`tid`)
) ENGINE=InnoDB AUTO_INCREMENT=2935 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ap_es_default_st`
--

DROP TABLE IF EXISTS `ap_es_default_st`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_es_default_st` (
                                    `id` int NOT NULL AUTO_INCREMENT,
                                    `statementId` bigint NOT NULL,
                                    `subject` bigint NOT NULL,
                                    `predicate` bigint NOT NULL,
                                    `object` bigint DEFAULT NULL,
                                    `value` text,
                                    `author` bigint DEFAULT NULL,
                                    `timestamp` int DEFAULT NULL,
                                    `edNote` text,
                                    `statementMetadata` longtext,
                                    `cancellationId` bigint DEFAULT NULL,
                                    `cancelledBy` bigint DEFAULT NULL,
                                    `cancellationTs` int DEFAULT NULL,
                                    `cancellationMetadata` longtext,
                                    PRIMARY KEY (`id`),
                                    KEY `subject` (`subject`)
) ENGINE=InnoDB AUTO_INCREMENT=34625 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ap_es_merges`
--

DROP TABLE IF EXISTS `ap_es_merges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_es_merges` (
                                `id` int NOT NULL AUTO_INCREMENT,
                                `entity` bigint NOT NULL,
                                `mergedInto` bigint DEFAULT NULL,
                                PRIMARY KEY (`id`),
                                KEY `entity` (`entity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ap_items`
--

DROP TABLE IF EXISTS `ap_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_items` (
                            `id` int NOT NULL,
                            `valid_from` datetime(6) NOT NULL DEFAULT '2016-06-01 00:00:00.000000',
                            `valid_until` datetime(6) NOT NULL DEFAULT '9999-12-31 23:59:59.999999',
                            `type` int NOT NULL DEFAULT '0',
                            `ce_id` int NOT NULL,
                            `seq` int NOT NULL,
                            `lang` varchar(3) DEFAULT 'la',
                            `hand_id` int NOT NULL DEFAULT '0',
                            `text` text,
                            `alt_text` text,
                            `extra_info` varchar(128) DEFAULT NULL,
                            `length` int DEFAULT NULL,
                            `target` int DEFAULT NULL,
                            PRIMARY KEY (`id`,`valid_from`,`valid_until`),
                            KEY `hand_id` (`hand_id`),
                            KEY `ce_id` (`ce_id`),
                            KEY `type` (`type`),
                            CONSTRAINT `ap_items_ibfk_1` FOREIGN KEY (`ce_id`) REFERENCES `ap_elements` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ap_jobs`
--

DROP TABLE IF EXISTS `ap_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_jobs` (
                           `id` int NOT NULL AUTO_INCREMENT,
                           `signature` varchar(128) NOT NULL DEFAULT '''''',
                           `name` varchar(512) NOT NULL,
                           `description` varchar(512) DEFAULT '',
                           `payload` longblob,
                           `state` varchar(32) DEFAULT 'waiting',
                           `scheduled_at` datetime(6) NOT NULL,
                           `max_attempts` int DEFAULT '1',
                           `secs_between_retries` int DEFAULT '5',
                           `completed_runs` int DEFAULT '0',
                           `last_run_at` datetime(6) DEFAULT NULL,
                           `next_retry_at` datetime(6) DEFAULT NULL,
                           PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=36713 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ap_mc_editions`
--

DROP TABLE IF EXISTS `ap_mc_editions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_mc_editions` (
                                  `id` int NOT NULL,
                                  `valid_from` datetime(6) NOT NULL DEFAULT '2022-08-19 00:00:00.000000',
                                  `valid_until` datetime(6) NOT NULL DEFAULT '9999-12-31 23:59:59.999999',
                                  `chunks` varchar(4192) NOT NULL,
                                  `title` varchar(128) DEFAULT 'NoTitle',
                                  `compressed` tinyint NOT NULL DEFAULT '0',
                                  `mce_data` longblob NOT NULL,
                                  `archived` tinyint NOT NULL DEFAULT '0',
                                  `author_tid` bigint unsigned DEFAULT '0',
                                  `version_description` varchar(2048) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
                                  PRIMARY KEY (`id`,`valid_from`,`valid_until`),
                                  KEY `author_tid` (`author_tid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ap_pages`
--

DROP TABLE IF EXISTS `ap_pages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_pages` (
                            `id` int NOT NULL,
                            `valid_from` datetime(6) NOT NULL DEFAULT '2016-06-01 00:00:00.000000',
                            `valid_until` datetime(6) NOT NULL DEFAULT '9999-12-31 23:59:59.999999',
                            `doc_id` bigint DEFAULT NULL,
                            `page_number` int NOT NULL,
                            `img_number` int NOT NULL,
                            `seq` int NOT NULL,
                            `type` int NOT NULL,
                            `lang` bigint NOT NULL DEFAULT '20003',
                            `num_cols` int NOT NULL DEFAULT '0',
                            `foliation` varchar(16) DEFAULT NULL,
                            PRIMARY KEY (`id`,`valid_from`,`valid_until`),
                            KEY `doc_id` (`doc_id`),
                            KEY `type` (`type`),
                            KEY `seq` (`seq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ap_people`
--

DROP TABLE IF EXISTS `ap_people`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_people` (
                             `id` int NOT NULL,
                             `tid` bigint unsigned DEFAULT '0',
                             `name` varchar(1024) NOT NULL,
                             `sort_name` varchar(1024) DEFAULT NULL,
                             `slug` varchar(1024) DEFAULT NULL,
                             PRIMARY KEY (`id`),
                             KEY `tid` (`tid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ap_presets`
--

DROP TABLE IF EXISTS `ap_presets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_presets` (
                              `id` int NOT NULL,
                              `tool` varchar(512) DEFAULT '',
                              `user_tid` bigint unsigned DEFAULT '0',
                              `title` varchar(1024) DEFAULT NULL,
                              `key_array` text,
                              `data` text,
                              `key1` varchar(512) DEFAULT NULL,
                              `key2` varchar(512) DEFAULT NULL,
                              PRIMARY KEY (`id`),
                              KEY `tool` (`tool`),
                              KEY `tool_user` (`tool`(32)),
                              KEY `tool_keys` (`tool`(32),`key1`(32),`key2`(32)),
                              KEY `user_tid` (`user_tid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ap_relations`
--

DROP TABLE IF EXISTS `ap_relations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_relations` (
                                `id` int unsigned NOT NULL,
                                `user_tid` bigint unsigned DEFAULT '0',
                                `relation` varchar(32) NOT NULL,
                                `attribute` varchar(128) NOT NULL,
                                PRIMARY KEY (`id`),
                                KEY `user_tid` (`user_tid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ap_sessions_log`
--

DROP TABLE IF EXISTS `ap_sessions_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_sessions_log` (
                                   `id` int NOT NULL AUTO_INCREMENT,
                                   `session_id` bigint NOT NULL,
                                   `time` datetime(6) NOT NULL,
                                   `source` varchar(20) NOT NULL,
                                   `msg` varchar(1024) NOT NULL,
                                   `extra_data` json DEFAULT NULL,
                                   PRIMARY KEY (`id`),
                                   KEY `session_id` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ap_sessions_register`
--

DROP TABLE IF EXISTS `ap_sessions_register`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_sessions_register` (
                                        `id` int NOT NULL AUTO_INCREMENT,
                                        `session_id` bigint NOT NULL,
                                        `user_id` bigint NOT NULL,
                                        `is_open` tinyint NOT NULL,
                                        `data` longtext,
                                        PRIMARY KEY (`id`),
                                        KEY `session_id` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ap_settings`
--

DROP TABLE IF EXISTS `ap_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_settings` (
                               `id` int NOT NULL,
                               `setting` varchar(16) NOT NULL,
                               `value` varchar(512) NOT NULL,
                               PRIMARY KEY (`setting`),
                               UNIQUE KEY `id` (`id`),
                               KEY `id_2` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ap_system_cache`
--

DROP TABLE IF EXISTS `ap_system_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_system_cache` (
                                   `id` int NOT NULL AUTO_INCREMENT,
                                   `cache_key` varchar(512) NOT NULL,
                                   `value` longtext,
                                   `set_at` datetime(6) NOT NULL,
                                   `expires` datetime(6) NOT NULL DEFAULT '9999-12-31 23:59:59.999999',
                                   PRIMARY KEY (`id`),
                                   UNIQUE KEY `cache_key` (`cache_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ap_tokens`
--

DROP TABLE IF EXISTS `ap_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_tokens` (
                             `id` int NOT NULL AUTO_INCREMENT,
                             `user_tid` bigint unsigned DEFAULT '0',
                             `user_agent` varchar(512) NOT NULL,
                             `ip_address` varchar(32) NOT NULL,
                             `token` varchar(128) NOT NULL,
                             `creation_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                             PRIMARY KEY (`id`),
                             KEY `user_tid` (`user_tid`)
) ENGINE=InnoDB AUTO_INCREMENT=2035 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ap_types_page`
--

DROP TABLE IF EXISTS `ap_types_page`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_types_page` (
                                 `id` int NOT NULL,
                                 `name` varchar(32) NOT NULL,
                                 `descr` varchar(1024) DEFAULT NULL,
                                 PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ap_users`
--

DROP TABLE IF EXISTS `ap_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_users` (
                            `id` bigint NOT NULL,
                            `username` varchar(128) NOT NULL,
                            `password` varchar(512) DEFAULT NULL,
                            `email_address` varchar(1024) DEFAULT NULL,
                            `tags` varchar(1024) DEFAULT '',
                            PRIMARY KEY (`id`),
                            UNIQUE KEY `email_address` (`email_address`),
                            KEY `UsernamesIdx` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ap_versions_ct`
--

DROP TABLE IF EXISTS `ap_versions_ct`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_versions_ct` (
                                  `id` int NOT NULL,
                                  `ct_id` int NOT NULL,
                                  `time_from` datetime(6) NOT NULL,
                                  `time_until` datetime(6) DEFAULT NULL,
                                  `author_tid` bigint unsigned DEFAULT '0',
                                  `descr` varchar(2048) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
                                  `minor` tinyint NOT NULL DEFAULT '0',
                                  `review` tinyint NOT NULL DEFAULT '0',
                                  PRIMARY KEY (`id`),
                                  KEY `ap_versions_ct_ctid` (`ct_id`),
                                  KEY `author_tid` (`author_tid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ap_versions_tx`
--

DROP TABLE IF EXISTS `ap_versions_tx`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_versions_tx` (
                                  `id` int NOT NULL,
                                  `page_id` int NOT NULL,
                                  `col` int NOT NULL,
                                  `time_from` datetime(6) NOT NULL,
                                  `time_until` datetime(6) DEFAULT NULL,
                                  `author_tid` bigint unsigned DEFAULT '0',
                                  `descr` varchar(512) NOT NULL DEFAULT '',
                                  `minor` tinyint NOT NULL DEFAULT '0',
                                  `review` tinyint NOT NULL DEFAULT '0',
                                  `is_published` tinyint NOT NULL DEFAULT '0',
                                  PRIMARY KEY (`id`),
                                  KEY `ap_versions_tx_pageid` (`page_id`),
                                  KEY `author_tid` (`author_tid`),
                                  CONSTRAINT `ap_versions_tx_pageid` FOREIGN KEY (`page_id`) REFERENCES `ap_pages` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ap_works`
--

DROP TABLE IF EXISTS `ap_works`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ap_works` (
                            `id` int NOT NULL AUTO_INCREMENT,
                            `tid` bigint unsigned DEFAULT '0',
                            `dare_id` varchar(5) DEFAULT '',
                            `author_tid` bigint unsigned DEFAULT '0',
                            `title` varchar(512) DEFAULT NULL,
                            `short_title` varchar(512) DEFAULT '',
                            `enabled` tinyint(1) NOT NULL DEFAULT '0',
                            PRIMARY KEY (`id`),
                            UNIQUE KEY `dare_id` (`dare_id`),
                            KEY `tid` (`tid`),
                            KEY `author_tid` (`author_tid`)
) ENGINE=InnoDB AUTO_INCREMENT=502 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-05  9:43:52



INSERT INTO `ap_settings` (`id`, `setting`, `value`) VALUES
    (1, 'DatabaseVersion', '37');