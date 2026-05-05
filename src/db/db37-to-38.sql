#
# Before running this script, stop the APM daemon and workers
#

#
# RUN:
#   migrate_edition_sources
#   migrate_docs
#

DROP TABLE ap_chunks;
DROP TABLE ap_relations;
DROP TABLE ap_people;
DROP TABLE ap_jobs;
DROP TABLE ap_sessions_log;
DROP TABLE ap_sessions_register;
DROP TABLE ap_docs;
DROP TABLE ap_edition_sources;

UPDATE `ap_settings` SET `value` = '38' WHERE `ap_settings`.`setting` = 'DatabaseVersion';