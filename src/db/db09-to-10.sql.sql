/*
 * Copyright (C) 2017 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

/**
 * Author:  Rafael Nájera <rafael.najera@uni-koeln.de>
 * Created: May 18, 2017
 */

INSERT INTO `ap_types_item` (`id`, `name`, `descr`) VALUES ('15', 'charactergap', 'Character Gap');
INSERT INTO `ap_types_item` (`id`, `name`, `descr`) VALUES ('16', 'paragraphmark', 'Paragraph Mark');

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

--
-- Indexes for dumped tables
--

--
-- Indexes for table `ap_tokens`
--
ALTER TABLE `ap_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `ap_tokens`
--
ALTER TABLE `ap_tokens`
  ADD CONSTRAINT `ap_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `ap_users` (`id`) ON UPDATE CASCADE;



UPDATE `ap_settings` SET `value` = '10' WHERE `ap_settings`.`setting` = 'dbversion';