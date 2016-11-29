--
-- SQL code to migrate the Averroes DB from 0.02 to 0.03
-- 
-- Created 2016-11-29
--
--  ATTENTION: backup the database before runnning this code!
--
ALTER TABLE `ap_users` ADD `token` VARCHAR(128) DEFAULT NULL AFTER `email`;

CREATE TABLE `ap_people` (
  `id` int(11) NOT NULL,
  `fullname` varchar(200) NOT NULL,
  `email` varchar(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


INSERT INTO `ap_people` (`id`, `fullname`, `email`)
SELECT `id`, `fullname`, `email` FROM `ap_users`;

ALTER TABLE `ap_people` ADD PRIMARY KEY(`id`);

ALTER TABLE `ap_users` DROP `fullname`;
ALTER TABLE `ap_users` DROP `email`;

-- Run this for every user with a user id < 10 000
--   oldid = previous id
--   newid = random number between 10 000  and 100 000 (use www.random.org)

-- UPDATE `ap_people` SET `id`=newid WHERE  `id`=oldid;
-- UPDATE `ap_users` SET `id`=newid WHERE  `id`=oldid;
-- UPDATE `ap_elements` SET `editor_id`=newid WHERE  `editor_id`=oldid;
-- UPDATE `ap_ednotes` SET `author_id`=newid WHERE `author_id`=oldid;

UPDATE `ap_settings` SET `value`='0.03' WHERE `key`='dbversion';