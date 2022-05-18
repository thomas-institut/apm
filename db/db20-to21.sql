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
 * Created: 26 Feb 2020
 */

CREATE TABLE `ap_system_cache` (
                                    `id` int(11) NOT NULL,
                                    `cachekey` varchar(512) NOT NULL,
                                    `value` longblob NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


ALTER TABLE `ap_system_cache`
    ADD PRIMARY KEY (`cachekey`);

#
# By default this is
SET GLOBAL max_allowed_packet=104857600;

UPDATE `ap_settings` SET `value` = '21' WHERE `ap_settings`.`setting` = 'dbversion';