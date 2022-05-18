/*
 * Copyright (C) 2016-19 Universität zu Köln
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
 * Created: Mar 13, 2019
 */


CREATE TABLE `ap_presets` (
  `id` int(11) NOT NULL,
  `tool` varchar(512) DEFAULT '',
  `user_id` int(11) DEFAULT NULL,
  `title` varchar(1024) DEFAULT NULL,
  `key_array` TEXT DEFAULT NULL,
  `data` TEXT DEFAULT NULL,
  `key1` varchar(512) DEFAULT NULL,
  `key2` varchar(512) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

ALTER TABLE `ap_presets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tool` (`tool`), 
  ADD KEY `tool_user` (`tool`(32), `user_id`), 
  ADD KEY `tool_keys` (`tool`(32), `key1`(32), `key2`(32));

ALTER TABLE `ap_presets`
  ADD CONSTRAINT `ap_presets_useridfk` FOREIGN KEY (`user_id`) REFERENCES `ap_users` (`id`) ON UPDATE CASCADE;



UPDATE `ap_settings` SET `value` = '17' WHERE `ap_settings`.`setting` = 'dbversion';