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
 * Created: 27 April 2020
 */

# Add a type column to ctables with default 'ctable'
ALTER TABLE `ap_versions_tx` ADD `is_published` tinyint(4) NOT NULL default '0' AFTER `review`;

UPDATE `ap_settings` SET `value` = '24' WHERE `ap_settings`.`setting` = 'dbversion';