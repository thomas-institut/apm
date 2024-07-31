#
# Before running this script, stop the APM daemon, flush the system cache and make sure there are no
# jobs in 'waiting' state
#

# Run:
#     migrate_works

UPDATE `ap_settings` SET `value` = '34' WHERE `ap_settings`.`setting` = 'DatabaseVersion';