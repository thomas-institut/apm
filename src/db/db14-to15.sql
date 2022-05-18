/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
/**
 * Author:  Rafael Nájera <rafael.najera@uni-koeln.de>
 * Created: Jan 25, 2018
 */

ALTER TABLE `ap_items` CHANGE `text` `text` TEXT CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL;
ALTER TABLE `ap_items` CHANGE `alt_text` `alt_text` TEXT CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL;

UPDATE `ap_settings` SET `value` = '15' WHERE `ap_settings`.`setting` = 'dbversion';