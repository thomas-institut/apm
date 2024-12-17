#
# Before running this script, stop the APM daemon, flush the system cache and make sure there are no
# jobs in 'waiting' state
#


#
# RUN:
#   migrate_edition_sources
#   migrate_docs
#

DROP TABLE  `ap_edition_sources`;

UPDATE `ap_settings` SET `value` = '37' WHERE `ap_settings`.`setting` = 'DatabaseVersion';