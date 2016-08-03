CREATE TABLE IF NOT EXISTS `apm_users` (
  `id` int(11) NOT NULL,
  `username` varchar(16) NOT NULL,
  `password` varchar(512) NOT NULL,
  `fullname` varchar(512) DEFAULT NULL,
  `email` varchar(512) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


ALTER TABLE `apm_users`
 ADD PRIMARY KEY (`id`), ADD UNIQUE KEY `id` (`id`);

insert into `apm_users` (`id`, `username`, `password`) values (1, 'rafael', '$2y$10$5Twe8z4URsXYz5dVTpIhr.ye/yrOyFTFI6XWkhh5Pyt3eYwGTg29C');

