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


/*
 1. Witness local Id is stored in chunk mark items in the 'extra_info' column
    By default, witnessLocalId is 'A'
 */

UPDATE `ap_items` SET `extra_info`='A' WHERE `type`=14 AND `extra_info` IS NULL;


UPDATE `ap_settings` SET `value` = '19' WHERE `ap_settings`.`setting` = 'dbversion';