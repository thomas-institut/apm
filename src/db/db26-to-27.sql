# noinspection SqlNoDataSourceInspectionForFile

/*
 * Copyright (C) 2021 Universität zu Köln
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
 * Created: 19 Aug 2022
 */

/* Multi-chunk edition table*/

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

ALTER TABLE `ap_mc_editions`
    ADD CONSTRAINT `ap_mc_editions_author` FOREIGN KEY (`author_id`) REFERENCES `ap_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ap_mc_editions`
    ADD PRIMARY KEY (`id`,`valid_from`,`valid_until`);

UPDATE `ap_settings` SET `value` = '27' WHERE `ap_settings`.`setting` = 'dbversion';