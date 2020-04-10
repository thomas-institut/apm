/*
 * Copyright (C) 2016-20 Universität zu Köln
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
 * Created: 09 Apr 2020
 */

CREATE TABLE `ap_ctables` (
   `id` int(11) NOT NULL,
   `valid_from` datetime(6) NOT NULL DEFAULT '2020-04-09 00:00:00.000000',
   `valid_until` datetime(6) NOT NULL DEFAULT '9999-12-31 23:59:59.999999',
   `chunk_id` varchar(32) not null ,
   `witnesses_json` varchar(4192) not null,
   `title` varchar(128) DEFAULT  'NoTitle',
   `compressed` tinyint(4) NOT NULL DEFAULT '0',
   `data` longblob NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


CREATE TABLE `ap_versions_ct` (
   `id` int(11) NOT NULL,
   `ct_id` int(11) NOT NULL,
   `time_from` datetime(6) NOT NULL,
   `time_until` datetime(6) DEFAULT NULL,
   `author_id` int(11) DEFAULT NULL,
   `descr` varchar(512) NOT NULL DEFAULT '',
   `minor` tinyint(4) NOT NULL DEFAULT '0',
   `review` tinyint(4) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


ALTER TABLE `ap_versions_ct`
    ADD PRIMARY KEY (`id`),
    ADD KEY `ap_versions_ct_author` (`author_id`),
    ADD KEY `ap_versions_ct_ctid` (`ct_id`);


ALTER TABLE `ap_versions_ct`
    ADD CONSTRAINT `ap_versions_ct_author` FOREIGN KEY (`author_id`) REFERENCES `ap_users` (`id`) ON UPDATE CASCADE;



UPDATE `ap_settings` SET `value` = '22' WHERE `ap_settings`.`setting` = 'dbversion';