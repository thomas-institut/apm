-- phpMyAdmin SQL Dump
-- version 5.1.1deb5ubuntu1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Apr 19, 2023 at 09:17 AM
-- Server version: 8.0.32-0ubuntu0.22.04.2
-- PHP Version: 8.1.2-1ubuntu2.11

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

--
-- Database: `apm`
--

-- --------------------------------------------------------

--
-- Table structure for table `ap_chunks`
--

DROP TABLE IF EXISTS `ap_chunks`;
CREATE TABLE `ap_chunks` (
                             `id` int NOT NULL,
                             `dare_id` varchar(5) NOT NULL,
                             `max_chunk_id` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `ap_ctables`
--

DROP TABLE IF EXISTS `ap_ctables`;
CREATE TABLE `ap_ctables` (
                              `id` int NOT NULL,
                              `valid_from` datetime(6) NOT NULL DEFAULT '2020-04-09 00:00:00.000000',
                              `valid_until` datetime(6) NOT NULL DEFAULT '9999-12-31 23:59:59.999999',
                              `chunk_id` varchar(32) NOT NULL,
                              `type` varchar(16) NOT NULL,
                              `witnesses_json` varchar(4192) NOT NULL,
                              `title` varchar(128) DEFAULT 'NoTitle',
                              `compressed` tinyint NOT NULL DEFAULT '0',
                              `archived` tinyint NOT NULL DEFAULT '0',
                              `data` longblob NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `ap_docs`
--

DROP TABLE IF EXISTS `ap_docs`;
CREATE TABLE `ap_docs` (
                           `id` int NOT NULL,
                           `title` varchar(512) DEFAULT NULL,
                           `short_title` varchar(512) DEFAULT '',
                           `lang` varchar(3) DEFAULT 'la',
                           `doc_type` varchar(16) DEFAULT 'mss',
                           `image_source` varchar(16) DEFAULT 'local',
                           `image_source_data` varchar(512) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `ap_edition_sources`
--

DROP TABLE IF EXISTS `ap_edition_sources`;
CREATE TABLE `ap_edition_sources` (
                                      `id` int NOT NULL,
                                      `title` varchar(256) NOT NULL,
                                      `description` varchar(1024) NOT NULL,
                                      `default_siglum` varchar(8) NOT NULL,
                                      `uuid` binary(16) NOT NULL DEFAULT (uuid_to_bin(uuid()))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ap_ednotes`
--

DROP TABLE IF EXISTS `ap_ednotes`;
CREATE TABLE `ap_ednotes` (
                              `id` int NOT NULL,
                              `type` int NOT NULL DEFAULT '0',
                              `target` int NOT NULL DEFAULT '0',
                              `lang` varchar(3) DEFAULT 'la',
                              `author_id` int NOT NULL DEFAULT '0',
                              `time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              `text` varchar(2048) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `ap_elements`
--

DROP TABLE IF EXISTS `ap_elements`;
CREATE TABLE `ap_elements` (
                               `id` int NOT NULL,
                               `valid_from` datetime(6) NOT NULL DEFAULT '2016-06-01 00:00:00.000000',
                               `valid_until` datetime(6) NOT NULL DEFAULT '9999-12-31 23:59:59.999999',
                               `type` int NOT NULL DEFAULT '0',
                               `page_id` int NOT NULL,
                               `column_number` int NOT NULL DEFAULT '0',
                               `seq` int NOT NULL,
                               `lang` varchar(3) DEFAULT 'la',
                               `editor_id` int NOT NULL DEFAULT '0',
                               `hand_id` int NOT NULL DEFAULT '0',
                               `reference` int DEFAULT NULL,
                               `placement` varchar(64) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `ap_items`
--

DROP TABLE IF EXISTS `ap_items`;
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
                            `target` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `ap_jobs`
--

DROP TABLE IF EXISTS `ap_jobs`;
CREATE TABLE `ap_jobs` (
                           `id` int NOT NULL,
                           `name` varchar(512) NOT NULL,
                           `description` varchar(512) DEFAULT '',
                           `payload` longblob,
                           `state` varchar(32) DEFAULT 'waiting',
                           `scheduled_at` datetime(6) NOT NULL,
                           `max_attempts` int DEFAULT '1',
                           `secs_between_retries` int DEFAULT '5',
                           `completed_runs` int DEFAULT '0',
                           `last_run_at` datetime(6) DEFAULT NULL,
                           `next_retry_at` datetime(6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `ap_mc_editions`
--

DROP TABLE IF EXISTS `ap_mc_editions`;
CREATE TABLE `ap_mc_editions` (
                                  `id` int NOT NULL,
                                  `valid_from` datetime(6) NOT NULL DEFAULT '2022-08-19 00:00:00.000000',
                                  `valid_until` datetime(6) NOT NULL DEFAULT '9999-12-31 23:59:59.999999',
                                  `chunks` varchar(4192) NOT NULL,
                                  `title` varchar(128) DEFAULT 'NoTitle',
                                  `compressed` tinyint NOT NULL DEFAULT '0',
                                  `mce_data` longblob NOT NULL,
                                  `archived` tinyint NOT NULL DEFAULT '0',
                                  `author_id` int DEFAULT NULL,
                                  `version_description` varchar(2048) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `ap_pages`
--

DROP TABLE IF EXISTS `ap_pages`;
CREATE TABLE `ap_pages` (
                            `id` int NOT NULL,
                            `valid_from` datetime(6) NOT NULL DEFAULT '2016-06-01 00:00:00.000000',
                            `valid_until` datetime(6) NOT NULL DEFAULT '9999-12-31 23:59:59.999999',
                            `doc_id` int NOT NULL,
                            `page_number` int NOT NULL,
                            `img_number` int NOT NULL,
                            `seq` int NOT NULL,
                            `type` int NOT NULL,
                            `lang` varchar(3) DEFAULT 'la',
                            `num_cols` int NOT NULL DEFAULT '0',
                            `foliation` varchar(16) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `ap_people`
--

DROP TABLE IF EXISTS `ap_people`;
CREATE TABLE `ap_people` (
                             `id` int NOT NULL,
                             `fullname` varchar(200) NOT NULL,
                             `email` varchar(200) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `ap_presets`
--

DROP TABLE IF EXISTS `ap_presets`;
CREATE TABLE `ap_presets` (
                              `id` int NOT NULL,
                              `tool` varchar(512) DEFAULT '',
                              `user_id` int DEFAULT NULL,
                              `title` varchar(1024) DEFAULT NULL,
                              `key_array` text,
                              `data` text,
                              `key1` varchar(512) DEFAULT NULL,
                              `key2` varchar(512) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `ap_relations`
--

DROP TABLE IF EXISTS `ap_relations`;
CREATE TABLE `ap_relations` (
                                `id` int UNSIGNED NOT NULL,
                                `userId` int NOT NULL,
                                `relation` varchar(32) NOT NULL,
                                `attribute` varchar(128) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `ap_scheduler`
--

DROP TABLE IF EXISTS `ap_scheduler`;
CREATE TABLE `ap_scheduler` (
                                `id` int NOT NULL,
                                `doc_id` int NOT NULL,
                                `page` int NOT NULL,
                                `col` int NOT NULL,
                                `time_scheduled` datetime(6) NOT NULL DEFAULT '2016-06-01 00:00:00.000000',
                                `time_processed` datetime(6) DEFAULT NULL,
                                `opensearch_id` int DEFAULT NULL,
                                `state` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ap_settings`
--

DROP TABLE IF EXISTS `ap_settings`;
CREATE TABLE `ap_settings` (
                               `id` int NOT NULL,
                               `setting` varchar(16) NOT NULL,
                               `value` varchar(512) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `ap_system_cache`
--

DROP TABLE IF EXISTS `ap_system_cache`;
CREATE TABLE `ap_system_cache` (
                                   `id` int NOT NULL,
                                   `cache_key` varchar(512) NOT NULL,
                                   `value` longblob,
                                   `set_at` datetime(6) NOT NULL,
                                   `expires` datetime(6) NOT NULL DEFAULT '9999-12-31 23:59:59.999999'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `ap_tokens`
--

DROP TABLE IF EXISTS `ap_tokens`;
CREATE TABLE `ap_tokens` (
                             `id` int NOT NULL,
                             `user_id` int NOT NULL,
                             `user_agent` varchar(512) NOT NULL,
                             `ip_address` varchar(32) NOT NULL,
                             `token` varchar(128) NOT NULL,
                             `creation_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `ap_types_page`
--

DROP TABLE IF EXISTS `ap_types_page`;
CREATE TABLE `ap_types_page` (
                                 `id` int NOT NULL,
                                 `name` varchar(32) NOT NULL,
                                 `descr` varchar(1024) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `ap_users`
--

DROP TABLE IF EXISTS `ap_users`;
CREATE TABLE `ap_users` (
                            `id` int NOT NULL,
                            `username` varchar(16) NOT NULL,
                            `password` varchar(512) DEFAULT NULL,
                            `token` varchar(128) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `ap_versions_ct`
--

DROP TABLE IF EXISTS `ap_versions_ct`;
CREATE TABLE `ap_versions_ct` (
                                  `id` int NOT NULL,
                                  `ct_id` int NOT NULL,
                                  `time_from` datetime(6) NOT NULL,
                                  `time_until` datetime(6) DEFAULT NULL,
                                  `author_id` int DEFAULT NULL,
                                  `descr` varchar(2048) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
                                  `minor` tinyint NOT NULL DEFAULT '0',
                                  `review` tinyint NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `ap_versions_tx`
--

DROP TABLE IF EXISTS `ap_versions_tx`;
CREATE TABLE `ap_versions_tx` (
                                  `id` int NOT NULL,
                                  `page_id` int NOT NULL,
                                  `col` int NOT NULL,
                                  `time_from` datetime(6) NOT NULL,
                                  `time_until` datetime(6) DEFAULT NULL,
                                  `author_id` int DEFAULT NULL,
                                  `descr` varchar(512) NOT NULL DEFAULT '',
                                  `minor` tinyint NOT NULL DEFAULT '0',
                                  `review` tinyint NOT NULL DEFAULT '0',
                                  `is_published` tinyint NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- --------------------------------------------------------

--
-- Table structure for table `ap_works`
--

DROP TABLE IF EXISTS `ap_works`;
CREATE TABLE `ap_works` (
                            `id` int NOT NULL,
                            `dare_id` varchar(5) DEFAULT '',
                            `author_id` int DEFAULT NULL,
                            `title` varchar(512) DEFAULT NULL,
                            `short_title` varchar(512) DEFAULT '',
                            `enabled` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `ap_chunks`
--
ALTER TABLE `ap_chunks`
    ADD PRIMARY KEY (`id`),
    ADD KEY `dare_id` (`dare_id`);

--
-- Indexes for table `ap_ctables`
--
ALTER TABLE `ap_ctables`
    ADD PRIMARY KEY (`id`,`valid_from`,`valid_until`),
    ADD KEY `chunk_id` (`chunk_id`);

--
-- Indexes for table `ap_docs`
--
ALTER TABLE `ap_docs`
    ADD PRIMARY KEY (`id`),
    ADD KEY `title` (`title`);

--
-- Indexes for table `ap_edition_sources`
--
ALTER TABLE `ap_edition_sources`
    ADD PRIMARY KEY (`id`);

--
-- Indexes for table `ap_ednotes`
--
ALTER TABLE `ap_ednotes`
    ADD PRIMARY KEY (`id`),
    ADD KEY `author_id` (`author_id`);

--
-- Indexes for table `ap_elements`
--
ALTER TABLE `ap_elements`
    ADD PRIMARY KEY (`id`,`valid_from`,`valid_until`),
    ADD KEY `editor_id` (`editor_id`),
    ADD KEY `hand_id` (`hand_id`),
    ADD KEY `type` (`type`),
    ADD KEY `page_id` (`page_id`),
    ADD KEY `column_number` (`column_number`),
    ADD KEY `page_id_2` (`page_id`,`editor_id`);

--
-- Indexes for table `ap_items`
--
ALTER TABLE `ap_items`
    ADD PRIMARY KEY (`id`,`valid_from`,`valid_until`),
    ADD KEY `hand_id` (`hand_id`),
    ADD KEY `ce_id` (`ce_id`),
    ADD KEY `type` (`type`);

--
-- Indexes for table `ap_jobs`
--
ALTER TABLE `ap_jobs`
    ADD PRIMARY KEY (`id`);

--
-- Indexes for table `ap_mc_editions`
--
ALTER TABLE `ap_mc_editions`
    ADD PRIMARY KEY (`id`,`valid_from`,`valid_until`),
    ADD KEY `ap_mc_editions_author` (`author_id`);

--
-- Indexes for table `ap_pages`
--
ALTER TABLE `ap_pages`
    ADD PRIMARY KEY (`id`,`valid_from`,`valid_until`),
    ADD KEY `doc_id` (`doc_id`),
    ADD KEY `type` (`type`),
    ADD KEY `seq` (`seq`);

--
-- Indexes for table `ap_people`
--
ALTER TABLE `ap_people`
    ADD PRIMARY KEY (`id`);

--
-- Indexes for table `ap_presets`
--
ALTER TABLE `ap_presets`
    ADD PRIMARY KEY (`id`),
    ADD KEY `tool` (`tool`),
    ADD KEY `tool_user` (`tool`(32),`user_id`),
    ADD KEY `tool_keys` (`tool`(32),`key1`(32),`key2`(32)),
    ADD KEY `ap_presets_useridfk` (`user_id`);

--
-- Indexes for table `ap_relations`
--
ALTER TABLE `ap_relations`
    ADD PRIMARY KEY (`id`),
    ADD KEY `uid` (`userId`);

--
-- Indexes for table `ap_scheduler`
--
ALTER TABLE `ap_scheduler`
    ADD PRIMARY KEY (`id`);

--
-- Indexes for table `ap_settings`
--
ALTER TABLE `ap_settings`
    ADD PRIMARY KEY (`setting`),
    ADD UNIQUE KEY `id` (`id`),
    ADD KEY `id_2` (`id`);

--
-- Indexes for table `ap_system_cache`
--
ALTER TABLE `ap_system_cache`
    ADD PRIMARY KEY (`id`);

--
-- Indexes for table `ap_tokens`
--
ALTER TABLE `ap_tokens`
    ADD PRIMARY KEY (`id`),
    ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `ap_types_page`
--
ALTER TABLE `ap_types_page`
    ADD PRIMARY KEY (`id`);

--
-- Indexes for table `ap_users`
--
ALTER TABLE `ap_users`
    ADD PRIMARY KEY (`id`),
    ADD KEY `UsernamesIdx` (`username`);

--
-- Indexes for table `ap_versions_ct`
--
ALTER TABLE `ap_versions_ct`
    ADD PRIMARY KEY (`id`),
    ADD KEY `ap_versions_ct_author` (`author_id`),
    ADD KEY `ap_versions_ct_ctid` (`ct_id`);

--
-- Indexes for table `ap_versions_tx`
--
ALTER TABLE `ap_versions_tx`
    ADD PRIMARY KEY (`id`),
    ADD KEY `ap_versions_tx_author` (`author_id`),
    ADD KEY `ap_versions_tx_pageid` (`page_id`);

--
-- Indexes for table `ap_works`
--
ALTER TABLE `ap_works`
    ADD PRIMARY KEY (`id`),
    ADD UNIQUE KEY `dare_id` (`dare_id`),
    ADD KEY `author_id` (`author_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `ap_jobs`
--
ALTER TABLE `ap_jobs`
    MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ap_system_cache`
--
ALTER TABLE `ap_system_cache`
    MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `ap_chunks`
--
ALTER TABLE `ap_chunks`
    ADD CONSTRAINT `ap_chunks_ibfk_1` FOREIGN KEY (`dare_id`) REFERENCES `ap_works` (`dare_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

--
-- Constraints for table `ap_ednotes`
--
ALTER TABLE `ap_ednotes`
    ADD CONSTRAINT `ap_ednotes_ibfk_1` FOREIGN KEY (`author_id`) REFERENCES `ap_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `ap_elements`
--
ALTER TABLE `ap_elements`
    ADD CONSTRAINT `ap_elements_ibfk_2` FOREIGN KEY (`editor_id`) REFERENCES `ap_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `ap_elements_ibfk_5` FOREIGN KEY (`page_id`) REFERENCES `ap_pages` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `ap_items`
--
ALTER TABLE `ap_items`
    ADD CONSTRAINT `ap_items_ibfk_1` FOREIGN KEY (`ce_id`) REFERENCES `ap_elements` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `ap_mc_editions`
--
ALTER TABLE `ap_mc_editions`
    ADD CONSTRAINT `ap_mc_editions_author` FOREIGN KEY (`author_id`) REFERENCES `ap_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `ap_pages`
--
ALTER TABLE `ap_pages`
    ADD CONSTRAINT `ap_pages_ibfk_1` FOREIGN KEY (`type`) REFERENCES `ap_types_page` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `ap_pages_ibfk_2` FOREIGN KEY (`doc_id`) REFERENCES `ap_docs` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `ap_presets`
--
ALTER TABLE `ap_presets`
    ADD CONSTRAINT `ap_presets_useridfk` FOREIGN KEY (`user_id`) REFERENCES `ap_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `ap_relations`
--
ALTER TABLE `ap_relations`
    ADD CONSTRAINT `fk_userid` FOREIGN KEY (`userId`) REFERENCES `ap_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `ap_tokens`
--
ALTER TABLE `ap_tokens`
    ADD CONSTRAINT `ap_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `ap_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `ap_users`
--
ALTER TABLE `ap_users`
    ADD CONSTRAINT `fk_user_people` FOREIGN KEY (`id`) REFERENCES `ap_people` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `ap_versions_ct`
--
ALTER TABLE `ap_versions_ct`
    ADD CONSTRAINT `ap_versions_ct_author` FOREIGN KEY (`author_id`) REFERENCES `ap_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `ap_versions_tx`
--
ALTER TABLE `ap_versions_tx`
    ADD CONSTRAINT `ap_versions_tx_author` FOREIGN KEY (`author_id`) REFERENCES `ap_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `ap_versions_tx_pageid` FOREIGN KEY (`page_id`) REFERENCES `ap_pages` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `ap_works`
--
ALTER TABLE `ap_works`
    ADD CONSTRAINT `ap_works_ibfk_1` FOREIGN KEY (`author_id`) REFERENCES `ap_people` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;




INSERT INTO `ap_types_page` (`id`, `name`, `descr`) VALUES
                                                        (0, 'notset', 'Type not set'),
                                                        (1, 'text', 'Regular page with text'),
                                                        (2, 'frontmatter', 'Front matter'),
                                                        (3, 'backmatter', 'Back matter');



INSERT INTO `ap_settings` (`id`, `setting`, `value`) VALUES
    (1, 'dbversion', '30');


COMMIT;