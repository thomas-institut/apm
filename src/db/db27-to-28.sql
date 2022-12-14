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
 * Created: 14 Dec 2022
 */

DROP TABLE `ap_scheduler`;

CREATE TABLE `ap_scheduler` (
    `id` int NOT NULL,
    `doc_id` int NOT NULL,
    `page` int NOT NULL,
    `col` int NOT NULL,
    `time_scheduled` datetime(6) NOT NULL DEFAULT '2016-06-01 00:00:00.000000',
    `time_processed` datetime(6) DEFAULT NULL,
    `opensearch_id` int DEFAULT NULL,
    `state` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


ALTER TABLE `ap_scheduler`
    ADD PRIMARY KEY (`id`);


UPDATE `ap_settings` SET `value` = '28' WHERE `ap_settings`.`setting` = 'dbversion';
