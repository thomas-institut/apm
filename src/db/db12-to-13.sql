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
 * Created: Nov 06, 2017
 */

ALTER TABLE `ap_elements` ADD INDEX `page_id_2` (`page_id`, `editor_id`);

ALTER TABLE ap_items DROP FOREIGN KEY ap_items_ibfk_2;
ALTER TABLE ap_elements DROP FOREIGN KEY ap_elements_ibfk_3;
DROP TABLE ap_hands;

UPDATE `ap_settings` SET `value` = '13' WHERE `ap_settings`.`setting` = 'dbversion';