#
# Database initialization for development
#
# Run this if there's no existing data in the dev-tmp folder.
# If that's the case, normally you will need to load a DB backup after this initialization.
#
CREATE DATABASE IF NOT EXISTS `apm`;
CREATE USER IF NOT EXISTS 'apm'@'%' IDENTIFIED BY 'apm';
GRANT ALL PRIVILEGES ON `apm`.* TO 'apm'@'%';
FLUSH PRIVILEGES;