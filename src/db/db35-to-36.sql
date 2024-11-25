#
# Before running this script, stop the APM daemon, flush the system cache and make sure there are no
# jobs in 'waiting' state
#

# Fixes Pasquale Porro's problem!
ALTER TABLE apm.ap_versions_ct DROP FOREIGN KEY ap_versions_ct_author;


UPDATE `ap_settings` SET `value` = '36' WHERE `ap_settings`.`setting` = 'DatabaseVersion';