/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
/**
 * Author:  Rafael Nájera <rafael.najera@uni-koeln.de>
 * Created: Nov 23, 2017
 */

-- phpMyAdmin SQL Dump
-- version 4.5.4.1deb2ubuntu2
-- http://www.phpmyadmin.net
--
-- Host: localhost
-- Generation Time: Nov 23, 2017 at 10:15 AM
-- Server version: 5.7.19-0ubuntu0.16.04.1
-- PHP Version: 7.0.22-0ubuntu0.16.04.1

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

--
-- Database: APM version 13
--

-- --------------------------------------------------------

--
-- Table structure for table `ap_chunks`
--

CREATE TABLE `ap_chunks` (
  `id` int(11) NOT NULL,
  `dare_id` varchar(5) NOT NULL,
  `max_chunk_id` int(11) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `ap_docs`
--

CREATE TABLE `ap_docs` (
  `id` int(11) NOT NULL,
  `title` varchar(512) DEFAULT NULL,
  `short_title` varchar(512) DEFAULT '',
  `lang` varchar(3) DEFAULT 'la',
  `doc_type` varchar(16) DEFAULT 'mss',
  `image_source` varchar(16) DEFAULT 'local',
  `image_source_data` varchar(512) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `ap_ednotes`
--

CREATE TABLE `ap_ednotes` (
  `id` int(11) NOT NULL,
  `type` int(11) NOT NULL DEFAULT '0',
  `target` int(11) NOT NULL DEFAULT '0',
  `lang` varchar(3) DEFAULT 'la',
  `author_id` int(11) NOT NULL DEFAULT '0',
  `time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `text` varchar(2048) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `ap_elements`
--

CREATE TABLE `ap_elements` (
  `id` int(11) NOT NULL,
  `valid_from` datetime(6) NOT NULL DEFAULT '2016-06-01 00:00:00.000000',
  `valid_until` datetime(6) NOT NULL DEFAULT '9999-12-31 23:59:59.999999',
  `type` int(11) NOT NULL DEFAULT '0',
  `page_id` int(11) NOT NULL,
  `column_number` int(11) NOT NULL DEFAULT '0',
  `seq` int(11) NOT NULL,
  `lang` varchar(3) DEFAULT 'la',
  `editor_id` int(11) NOT NULL DEFAULT '0',
  `hand_id` int(11) NOT NULL DEFAULT '0',
  `reference` int(11) DEFAULT NULL,
  `placement` varchar(64) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `ap_hands`
--

CREATE TABLE `ap_hands` (
  `id` int(11) NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` varchar(1024) DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `ap_items`
--

CREATE TABLE `ap_items` (
  `id` int(11) NOT NULL,
  `valid_from` datetime(6) NOT NULL DEFAULT '2016-06-01 00:00:00.000000',
  `valid_until` datetime(6) NOT NULL DEFAULT '9999-12-31 23:59:59.999999',
  `type` int(11) NOT NULL DEFAULT '0',
  `ce_id` int(11) NOT NULL,
  `seq` int(11) NOT NULL,
  `lang` varchar(3) DEFAULT 'la',
  `hand_id` int(11) NOT NULL DEFAULT '0',
  `text` varchar(1024) DEFAULT NULL,
  `alt_text` varchar(1024) DEFAULT NULL,
  `extra_info` varchar(128) DEFAULT NULL,
  `length` int(11) DEFAULT NULL,
  `target` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `ap_pages`
--

CREATE TABLE `ap_pages` (
  `id` int(11) NOT NULL,
  `valid_from` datetime(6) NOT NULL DEFAULT '2016-06-01 00:00:00.000000',
  `valid_until` datetime(6) NOT NULL DEFAULT '9999-12-31 23:59:59.999999',
  `doc_id` int(11) NOT NULL,
  `page_number` int(11) NOT NULL,
  `img_number` int(11) NOT NULL,
  `seq` int(11) NOT NULL,
  `type` int(11) NOT NULL,
  `lang` varchar(3) DEFAULT 'la',
  `num_cols` int(11) NOT NULL DEFAULT '0',
  `foliation` varchar(16) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `ap_people`
--

CREATE TABLE `ap_people` (
  `id` int(11) NOT NULL,
  `fullname` varchar(200) NOT NULL,
  `email` varchar(200) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `ap_relations`
--

CREATE TABLE `ap_relations` (
  `id` int(10) UNSIGNED NOT NULL,
  `userId` int(11) NOT NULL,
  `relation` varchar(32) NOT NULL,
  `attribute` varchar(128) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `ap_settings`
--

CREATE TABLE `ap_settings` (
  `id` int(11) NOT NULL,
  `setting` varchar(16) NOT NULL,
  `value` varchar(512) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `ap_tokens`
--

CREATE TABLE `ap_tokens` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `user_agent` varchar(512) NOT NULL,
  `ip_address` varchar(32) NOT NULL,
  `token` varchar(128) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `ap_types_element`
--

CREATE TABLE `ap_types_element` (
  `id` int(11) NOT NULL,
  `name` varchar(32) NOT NULL,
  `descr` varchar(1024) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `ap_types_element`
--

INSERT INTO `ap_types_element` (`id`, `name`, `descr`) VALUES
(1, 'line', 'Line of text inside a column'),
(2, 'head', 'Column or page heading'),
(3, 'gloss', 'Marginal gloss'),
(4, 'pagenumber', 'Page number'),
(5, 'custodes', 'Custodes'),
(6, 'notemark', 'A mark to which notes can refer'),
(7, 'addition', 'Added text'),
(8, 'linegap', 'Missing lines in transcription');

-- --------------------------------------------------------

--
-- Table structure for table `ap_types_item`
--

CREATE TABLE `ap_types_item` (
  `id` int(11) NOT NULL,
  `name` varchar(32) NOT NULL,
  `descr` varchar(1024) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `ap_types_item`
--

INSERT INTO `ap_types_item` (`id`, `name`, `descr`) VALUES
(1, 'text', 'Text'),
(2, 'rubric', 'Rubric'),
(3, 'sic', 'Sic: text that is obviously wrong. A corrected version could be provided'),
(4, 'unclear', 'Unclear text'),
(5, 'illegible', 'Illegible text'),
(6, 'gliph', 'Illegible gliph'),
(7, 'addition', 'Added text'),
(8, 'deletion', 'Deleted text'),
(9, 'mark', 'A mark in the text to which notes and extra column additions can refer'),
(10, 'nowb', 'A mark at the end of an element to signal that the word before it does not end at the break'),
(11, 'linebreak', 'Linebreak mark'),
(13, 'initial', 'Initial'),
(14, 'chunk', 'Chunk Mark'),
(15, 'charactergap', 'Character Gap'),
(16, 'paragraphmark', 'Paragraph Mark'),
(17, 'math_text', 'Mathematical text, e.g., symbols');

-- --------------------------------------------------------

--
-- Table structure for table `ap_types_page`
--

CREATE TABLE `ap_types_page` (
  `id` int(11) NOT NULL,
  `name` varchar(32) NOT NULL,
  `descr` varchar(1024) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `ap_types_page`
--

INSERT INTO `ap_types_page` (`id`, `name`, `descr`) VALUES
(0, 'notset', 'Type not set'),
(1, 'text', 'Regular page with text'),
(2, 'frontmatter', 'Front matter'),
(3, 'backmatter', 'Back matter');

-- --------------------------------------------------------

--
-- Table structure for table `ap_users`
--

CREATE TABLE `ap_users` (
  `id` int(11) NOT NULL,
  `username` varchar(16) NOT NULL,
  `password` varchar(512) DEFAULT NULL,
  `token` varchar(128) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `ap_works`
--

CREATE TABLE `ap_works` (
  `id` int(11) NOT NULL,
  `dare_id` varchar(5) DEFAULT '',
  `author_id` int(11) DEFAULT NULL,
  `title` varchar(512) DEFAULT NULL,
  `short_title` varchar(512) DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

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
-- Indexes for table `ap_docs`
--
ALTER TABLE `ap_docs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `title` (`title`);

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
-- Indexes for table `ap_hands`
--
ALTER TABLE `ap_hands`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `ap_items`
--
ALTER TABLE `ap_items`
  ADD PRIMARY KEY (`id`,`valid_from`,`valid_until`),
  ADD KEY `hand_id` (`hand_id`),
  ADD KEY `ce_id` (`ce_id`),
  ADD KEY `type` (`type`);

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
-- Indexes for table `ap_relations`
--
ALTER TABLE `ap_relations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uid` (`userId`);

--
-- Indexes for table `ap_settings`
--
ALTER TABLE `ap_settings`
  ADD PRIMARY KEY (`setting`),
  ADD UNIQUE KEY `id` (`id`),
  ADD KEY `id_2` (`id`);

--
-- Indexes for table `ap_tokens`
--
ALTER TABLE `ap_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `ap_types_element`
--
ALTER TABLE `ap_types_element`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `ap_types_item`
--
ALTER TABLE `ap_types_item`
  ADD PRIMARY KEY (`id`);

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
-- Indexes for table `ap_works`
--
ALTER TABLE `ap_works`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `dare_id` (`dare_id`),
  ADD KEY `author_id` (`author_id`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `ap_chunks`
--
ALTER TABLE `ap_chunks`
  ADD CONSTRAINT `ap_chunks_ibfk_1` FOREIGN KEY (`dare_id`) REFERENCES `ap_works` (`dare_id`);

--
-- Constraints for table `ap_ednotes`
--
ALTER TABLE `ap_ednotes`
  ADD CONSTRAINT `ap_ednotes_ibfk_1` FOREIGN KEY (`author_id`) REFERENCES `ap_users` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `ap_elements`
--
ALTER TABLE `ap_elements`
  ADD CONSTRAINT `ap_elements_ibfk_2` FOREIGN KEY (`editor_id`) REFERENCES `ap_users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `ap_elements_ibfk_3` FOREIGN KEY (`hand_id`) REFERENCES `ap_hands` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `ap_elements_ibfk_4` FOREIGN KEY (`type`) REFERENCES `ap_types_element` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `ap_elements_ibfk_5` FOREIGN KEY (`page_id`) REFERENCES `ap_pages` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `ap_items`
--
ALTER TABLE `ap_items`
  ADD CONSTRAINT `ap_items_ibfk_1` FOREIGN KEY (`ce_id`) REFERENCES `ap_elements` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `ap_items_ibfk_2` FOREIGN KEY (`hand_id`) REFERENCES `ap_hands` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `ap_items_ibfk_3` FOREIGN KEY (`type`) REFERENCES `ap_types_item` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `ap_pages`
--
ALTER TABLE `ap_pages`
  ADD CONSTRAINT `ap_pages_ibfk_1` FOREIGN KEY (`type`) REFERENCES `ap_types_page` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `ap_pages_ibfk_2` FOREIGN KEY (`doc_id`) REFERENCES `ap_docs` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `ap_relations`
--
ALTER TABLE `ap_relations`
  ADD CONSTRAINT `fk_userid` FOREIGN KEY (`userId`) REFERENCES `ap_users` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `ap_tokens`
--
ALTER TABLE `ap_tokens`
  ADD CONSTRAINT `ap_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `ap_users` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `ap_users`
--
ALTER TABLE `ap_users`
  ADD CONSTRAINT `fk_user_people` FOREIGN KEY (`id`) REFERENCES `ap_people` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `ap_works`
--
ALTER TABLE `ap_works`
  ADD CONSTRAINT `ap_works_ibfk_1` FOREIGN KEY (`author_id`) REFERENCES `ap_people` (`id`);

INSERT INTO `ap_settings` (`id`, `setting`, `value`) VALUES (1, 'dbversion', '13');
