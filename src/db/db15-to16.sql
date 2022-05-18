/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
/**
 * Author:  Rafael Nájera <rafael.najera@uni-koeln.de>
 * Created: Jan 25, 2018
 */

ALTER TABLE `ap_tokens` ADD `creation_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `token`;

UPDATE `ap_settings` SET `value` = '16' WHERE `ap_settings`.`setting` = 'dbversion';