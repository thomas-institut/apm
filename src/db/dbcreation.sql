-- Averroes Project
-- Database version 5

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- --------------------------------------------------------

--
-- Table structure for table `ap_docs`
--

CREATE TABLE `ap_docs` (
  `id` int(11) NOT NULL,
  `title` varchar(512) DEFAULT NULL,
  `short_title` varchar(512) DEFAULT '',
  `page_count` int(11) NOT NULL,
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
  `type` int(11) NOT NULL DEFAULT '0',
  `doc_id` int(11) NOT NULL,
  `page_number` int(11) NOT NULL,
  `column_number` int(11) NOT NULL DEFAULT '0',
  `seq` int(11) NOT NULL,
  `lang` varchar(3) DEFAULT 'la',
  `editor_id` int(11) NOT NULL DEFAULT '0',
  `hand_id` int(11) NOT NULL DEFAULT '0',
  `time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  `key` varchar(16) NOT NULL,
  `value` varchar(512) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `ap_users`
--

CREATE TABLE `ap_users` (
  `id` int(11) NOT NULL,
  `username` varchar(16) NOT NULL,
  `password` varchar(512) DEFAULT NULL,
  `token` varchar(128) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `ap_docs`
--
ALTER TABLE `ap_docs`
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
  ADD PRIMARY KEY (`id`),
  ADD KEY `doc_id` (`doc_id`),
  ADD KEY `editor_id` (`editor_id`),
  ADD KEY `hand_id` (`hand_id`);

--
-- Indexes for table `ap_hands`
--
ALTER TABLE `ap_hands`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `ap_items`
--
ALTER TABLE `ap_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `hand_id` (`hand_id`),
  ADD KEY `ce_id` (`ce_id`);

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
  ADD PRIMARY KEY (`key`);

--
-- Indexes for table `ap_users`
--
ALTER TABLE `ap_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `UsernamesIdx` (`username`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `ap_ednotes`
--
ALTER TABLE `ap_ednotes`
  ADD CONSTRAINT `ap_ednotes_ibfk_1` FOREIGN KEY (`author_id`) REFERENCES `ap_users` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `ap_elements`
--
ALTER TABLE `ap_elements`
  ADD CONSTRAINT `ap_elements_ibfk_1` FOREIGN KEY (`doc_id`) REFERENCES `ap_docs` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `ap_elements_ibfk_2` FOREIGN KEY (`editor_id`) REFERENCES `ap_users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `ap_elements_ibfk_3` FOREIGN KEY (`hand_id`) REFERENCES `ap_hands` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `ap_items`
--
ALTER TABLE `ap_items`
  ADD CONSTRAINT `ap_items_ibfk_1` FOREIGN KEY (`ce_id`) REFERENCES `ap_elements` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `ap_items_ibfk_2` FOREIGN KEY (`hand_id`) REFERENCES `ap_hands` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `ap_relations`
--
ALTER TABLE `ap_relations`
  ADD CONSTRAINT `fk_userid` FOREIGN KEY (`userId`) REFERENCES `ap_users` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `ap_users`
--
ALTER TABLE `ap_users`
  ADD CONSTRAINT `fk_user_people` FOREIGN KEY (`id`) REFERENCES `ap_people` (`id`) ON UPDATE CASCADE;


--
-- Default administrator account
--
INSERT INTO `ap_people` (`id`, `fullname`) VALUES 
    (32988, 'Default Administrator');

INSERT INTO `ap_users` (`id`, `username`, `password`) VALUES 
    (32988, 'admin', '$2y$10$5Twe8z4URsXYz5dVTpIhr.ye/yrOyFTFI6XWkhh5Pyt3eYwGTg29C');

INSERT INTO `ap_relations` (`id`, `userid`, `relation`, `attribute`) VALUES
    (1, 32988, 'hasRole', 'root');
