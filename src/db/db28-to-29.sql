CREATE TABLE `ap_edition_sources` (
    `id` int NOT NULL,
    `title` varchar(256) NOT NULL,
    `description` varchar(1024) NOT NULL,
    `default_siglum` varchar (8) NOT NULL,
    `entity` varchar(64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `ap_edition_sources`
    ADD PRIMARY KEY (`id`);


UPDATE `ap_settings` SET `value` = '29' WHERE `ap_settings`.`setting` = 'dbversion';
