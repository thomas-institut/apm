DROP TABLE IF EXISTS `ap_edition_styles`;

CREATE TABLE `ap_edition_styles` (
    `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `project_id` int default 1,
    `lang` varchar(8) NOT NULL,
    `name` varchar(512) NOT NULL,
    `description` varchar(512) DEFAULT '',
    `data` longtext
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `ap_projects`;

CREATE TABLE `ap_projects` (
    `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `parent` int default NULL,
    `name` varchar(512) NOT NULL,
    `institution` varchar(512) default '',
    `description` text DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `ap_projects` (`id`, `parent`, `name`, `institution`, `description`) VALUES
    (1, null, 'System', '', 'System-wide resources available to all projects'),
    (2, 1, 'Averroes', 'Thomas-Institut', 'A trilingual critical edition of Averroes conducted by the Thomas-Institut at the University of Cologne');

UPDATE `ap_settings` SET `value` = '31' WHERE `ap_settings`.`setting` = 'dbversion';