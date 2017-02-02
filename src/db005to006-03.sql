/* 
 *  Copyright (C) 2016 Universität zu Köln
 *  
 *  This program is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU General Public License
 *  as published by the Free Software Foundation; either version 2
 *  of the License, or (at your option) any later version.
 *   
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *  
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 *  
 */
/**
 * Author:  Rafael Nájera <rafael.najera@uni-koeln.de>
 * Created: Jan 30, 2017
 */

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- Drop foreign key for docs in ap_elements
-- CHECK the name of the FK before!!!
ALTER TABLE ap_elements DROP FOREIGN KEY ap_elements_ibfk_1;

ALTER TABLE `ap_elements` ADD `page_id` INT NOT NULL AFTER `type`;

UPDATE `ap_elements` SET `page_id`=(
    SELECT `id` FROM `ap_pages` 
    WHERE `ap_pages`.`doc_id`=`ap_elements`.`doc_id` 
        AND `ap_pages`.`page_number` = `ap_elements`.`page_number`
);

ALTER TABLE `ap_elements` ADD INDEX(`page_id`);

ALTER TABLE `ap_elements` ADD FOREIGN KEY (`page_id`) REFERENCES `ap_pages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ap_elements`
  DROP `doc_id`,
  DROP `page_number`;

UPDATE `ap_settings` SET `value` = '6' WHERE `ap_settings`.`key` = 'dbversion'