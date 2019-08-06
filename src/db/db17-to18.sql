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
 * Created: Aug 06, 2019
 */


CREATE TABLE `ap_versions_tx` (
                                  `id` int(11) NOT NULL,
                                  `page_id` int(11) NOT NULL,
                                  `col` int(11) NOT NULL,
                                  `time_from` datetime(6) NOT NULL,
                                  `time_until` datetime(6) DEFAULT NULL,
                                  `author_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


ALTER TABLE `ap_versions_tx`
    ADD PRIMARY KEY (`id`),
    ADD KEY `ap_versions_tx_author` (`author_id`),
    ADD KEY `ap_versions_tx_pageid` (`page_id`);


ALTER TABLE `ap_versions_tx`
    ADD CONSTRAINT `ap_versions_tx_author` FOREIGN KEY (`author_id`) REFERENCES `ap_users` (`id`) ON UPDATE CASCADE,
    ADD CONSTRAINT `ap_versions_tx_pageid` FOREIGN KEY (`page_id`) REFERENCES `ap_pages` (`id`) ON UPDATE CASCADE;

UPDATE `ap_settings` SET `value` = '18' WHERE `ap_settings`.`setting` = 'dbversion';