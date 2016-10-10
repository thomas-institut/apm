CREATE TABLE `ap_settings` (
    `key` varchar(16) NOT NULL,
    `value` varchar(512) NOT NULL,
    PRIMARY KEY(`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `ap_settings` (`key`, `value`) VALUES
    ('dbversion', '0.01');

CREATE TABLE `ap_users` (
  `id` int(11) NOT NULL,
  `username` varchar(16) NOT NULL,
  `password` varchar(512) DEFAULT NULL,
  `fullname` varchar(512) DEFAULT '',
  `email` varchar(512) DEFAULT NULL,
   PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE INDEX UsernamesIdx ON `ap_users`(`username`);

INSERT INTO `ap_users` (`id`, `username`, `password`, `fullname`) VALUES 
    (0, 'default', NULL, 'Unknown'),
    (1, 'rafael', '$2y$10$5Twe8z4URsXYz5dVTpIhr.ye/yrOyFTFI6XWkhh5Pyt3eYwGTg29C', 'Rafael Nájera');

CREATE TABLE `ap_elements` (
  `id` int(11) NOT NULL,
  `type` int(11) NOT NULL DEFAULT 0,
  `doc_id` varchar(45) NOT NULL,
  `page_number` int(11) NOT NULL,
  `column_number` int(11) NOT NULL DEFAULT 0,
  `seq`int(11) NOT NULL, 
  `lang` varchar(3) DEFAULT 'la',
  `editor_id` int(11) NOT NULL DEFAULT 0,
  `hand_id` int(11) NOT NULL DEFAULT 0,
  `time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reference` int(11) DEFAULT NULL,
  `placement` varchar(64) DEFAULT NULL,
   PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE INDEX DocIdIndex ON `ap_elements`(`doc_id`);

CREATE TABLE `ap_hands` (
  `id` int(11) NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` varchar(1024) DEFAULT '',
   PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `ap_hands` (`id`, `name`, `description`) VALUES
   (0, 'Unknown', 'Unknown hand');

CREATE TABLE `ap_ednotes` (
  `id` int(11) NOT NULL,
  `type` int(11) NOT NULL DEFAULT 0,
  `target` int(11) NOT NULL DEFAULT 0,
  `lang` varchar(3) DEFAULT 'la',
  `author_id` int(11) NOT NULL DEFAULT 0,
  `time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `text` varchar(2048) NOT NULL,
   PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `ap_items` (
  `id` int(11) NOT NULL,
  `type` int(11) NOT NULL DEFAULT 0,
  `ce_id` int(11) NOT NULL,
  `seq` int(11) NOT NULL,
  `lang` varchar(3) DEFAULT 'la',
  `hand_id` int(11) NOT NULL DEFAULT 0,
  `text` varchar(1024), 
  `alt_text` varchar(1024) DEFAULT NULL,
  `extra_info` varchar(128) DEFAULT NULL,
  `length` int(11) DEFAULT NULL,
  `target` int(11) DEFAULT NULL,
   PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

