/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
/**
 * Author:  Rafael Nájera <rafael.najera@uni-koeln.de>
 * Created: Jan 25, 2018
 */

ALTER TABLE ap_items DROP FOREIGN KEY ap_items_ibfk_3;
DROP TABLE ap_types_item;

ALTER TABLE ap_elements DROP FOREIGN KEY ap_elements_ibfk_4;
DROP TABLE ap_types_element;

UPDATE `ap_settings` SET `value` = '14' WHERE `ap_settings`.`setting` = 'dbversion';