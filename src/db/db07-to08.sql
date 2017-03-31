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
 * Created: Mar 14, 2017
 */

-- 
-- Changes to settings table
--
ALTER TABLE `ap_settings` ADD `id` INT NOT NULL FIRST;
UPDATE `ap_settings` SET `id` = '1' WHERE `ap_settings`.`key` = 'dbversion';
ALTER TABLE `ap_settings` ADD UNIQUE(`id`);
ALTER TABLE `ap_settings` ADD INDEX(`id`);
ALTER TABLE `ap_settings` CHANGE `key` `setting` VARCHAR(16) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL;

ALTER TABLE `ap_pages` ADD `num_cols` INT NOT NULL DEFAULT '0' AFTER `lang`;
UPDATE ap_pages, 
    (SELECT page_id AS pid, max(column_number) as ncols from ap_elements group by page_id) src  
    SET ap_pages.num_cols = src.ncols 
    WHERE ap_pages.id = pid;

UPDATE `ap_settings` SET `value` = '8' WHERE `ap_settings`.`setting` = 'dbversion';


ALTER TABLE `ap_items` 
    ADD `valid_from` DATETIME(6) NOT NULL DEFAULT '2016-06-01' AFTER `id`, 
    ADD `valid_until` DATETIME(6) NOT NULL DEFAULT '9999-12-31 23:59:59.999999' AFTER `valid_from`;

ALTER TABLE `ap_items`
  DROP PRIMARY KEY,
   ADD PRIMARY KEY(
     `id`,
     `valid_from`,
     `valid_until`);

ALTER TABLE `ap_elements` 
    ADD `valid_from` DATETIME(6) NOT NULL DEFAULT '2016-06-01' AFTER `id`, 
    ADD `valid_until` DATETIME(6) NOT NULL DEFAULT '9999-12-31 23:59:59.999999' AFTER `valid_from`;

UPDATE `ap_elements` SET `valid_from`=`time`;

ALTER TABLE `ap_elements`
  DROP PRIMARY KEY,
   ADD PRIMARY KEY(
     `id`,
     `valid_from`,
     `valid_until`);

ALTER TABLE `ap_elements` DROP `time`;