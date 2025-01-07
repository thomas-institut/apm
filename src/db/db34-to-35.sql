#
# Before running this script, stop the APM daemon, flush the system cache and make sure there are no
# jobs in 'waiting' state
#


# Add columns to split the chunk id into work and chunk number
# This may take a while!
ALTER TABLE `ap_ctables`
    ADD `work_id` VARCHAR(8) NOT NULL DEFAULT '' AFTER `chunk_id`,
    ADD `chunk_number` INT NOT NULL DEFAULT -1 AFTER `work_id`;

# Run:
#     migrate_ctables


ALTER TABLE `ap_ctables` ADD INDEX `apm_id` (`work_id`);

# Fixes Pasquale Porro's problem!
ALTER TABLE apm.ap_versions_ct DROP FOREIGN KEY ap_versions_ct_author;


UPDATE `ap_settings` SET `value` = '35' WHERE `ap_settings`.`setting` = 'DatabaseVersion';