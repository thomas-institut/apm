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
 * Created: Oct 16, 2017
 */

# Delete unused page types

UPDATE `ap_pages` SET `type` = '0' WHERE `type` = 2;
UPDATE `ap_pages` SET `type` = '0' WHERE `type` = 5;
UPDATE `ap_pages` SET `type` = '0' WHERE `type` = 6;
UPDATE `ap_pages` SET `type` = '0' WHERE `type` = 7;

DELETE FROM `ap_types_page` WHERE `ap_types_page`.`id` = 2;
DELETE FROM `ap_types_page` WHERE `ap_types_page`.`id` = 5;
DELETE FROM `ap_types_page` WHERE `ap_types_page`.`id` = 6;
DELETE FROM `ap_types_page` WHERE `ap_types_page`.`id` = 7;

UPDATE `ap_types_page` SET `id` = '2' WHERE `ap_types_page`.`id` = 3;
UPDATE `ap_types_page` SET `id` = '3' WHERE `ap_types_page`.`id` = 4;


UPDATE `ap_settings` SET `value` = '11' WHERE `ap_settings`.`setting` = 'dbversion';