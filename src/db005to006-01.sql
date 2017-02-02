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


CREATE TABLE `ap_types_item` (
  `id` int(11) NOT NULL,
  `name` varchar(32) NOT NULL,
  `descr` varchar(1024) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



INSERT INTO `ap_types_item` (`id`, `name`, `descr`) VALUES
(1, 'text', 'Text'),
(2, 'rubric', 'Rubric'),
(3, 'sic', 'Sic: text that is obviously wrong. A corrected version could be provided'),
(4, 'unclear', 'Unclear text'),
(5, 'illegible', 'Illegible text'),
(6, 'gliph', 'Illegible gliph'),
(7, 'addition', 'Added text'),
(8, 'deletion', 'Deleted text'),
(9, 'mark', 'A mark in the text to which notes and extra column additions can refer'),
(10, 'nolb', 'A mark at the end of an element to signal that the word before it does not end at the break'),
(11, 'linebreak', 'Linebreak mark');


ALTER TABLE `ap_types_item`
  ADD PRIMARY KEY (`id`);

CREATE TABLE `ap_types_element` (
  `id` int(11) NOT NULL,
  `name` varchar(32) NOT NULL,
  `descr` varchar(1024) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


INSERT INTO `ap_types_element` (`id`, `name`, `descr`) VALUES
(1, 'line', 'Line of text inside a column'),
(2, 'head', 'Column or page heading'),
(3, 'gloss', 'Marginal gloss'),
(4, 'pagenumber', 'Page number'),
(5, 'custodes', 'Custodes'),
(6, 'notemark', 'A mark to which notes can refer'),
(7, 'addition', 'Added text');


ALTER TABLE `ap_types_element` ADD PRIMARY KEY (`id`);

ALTER TABLE `ap_elements`  ADD KEY `type` (`type`);
ALTER TABLE `ap_elements` ADD FOREIGN KEY (`type`) REFERENCES `ap_types_element`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ap_items`  ADD KEY `type` (`type`);
ALTER TABLE `ap_items` ADD FOREIGN KEY (`type`) REFERENCES `ap_types_item`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;



CREATE TABLE `ap_types_page` (
  `id` int(11) NOT NULL,
  `name` varchar(32) NOT NULL,
  `descr` varchar(1024) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


INSERT INTO `ap_types_page` (`id`, `name`, `descr`) VALUES
(0, 'notset', 'Type not set'),
(1, 'text', 'Regular page with text'),
(2, 'blank', 'Blank page'),
(3, 'frontmatter', 'Front matter'),
(4, 'backmatter', 'Back matter'),
(5, 'spinepic', 'Picture of the spine'),
(6, 'pageblockpic', 'Picture of the text block'),
(7, 'coverpic', 'Picture of the cover');

ALTER TABLE `ap_types_page` ADD PRIMARY KEY (`id`);

CREATE TABLE `ap_pages` (
  `id` int(11) NOT NULL,
  `doc_id` int(11) NOT NULL,
  `page_number` int(11) NOT NULL,
  `type` int(11) NOT NULL,
  `lang` varchar(3) DEFAULT 'la',
  `foliation` varchar(16) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

ALTER TABLE `ap_pages` 
    ADD PRIMARY KEY (`id`),
    ADD KEY `doc_id` (`doc_id`), 
    ADD KEY `type` (`type`);

ALTER TABLE `ap_pages` ADD FOREIGN KEY (`type`) REFERENCES `ap_types_page`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ap_pages` ADD FOREIGN KEY (`doc_id`) REFERENCES `ap_docs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- NOTE: run script to generate page entries in ap_pages --