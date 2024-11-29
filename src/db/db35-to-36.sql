#
# Before running this script, stop the APM daemon, flush the system cache and make sure there are no
# jobs in 'waiting' state
#

# Fixes Pasquale Porro's problem!
ALTER TABLE apm.ap_versions_ct DROP FOREIGN KEY ap_versions_ct_author;

# Other table relations that depend on the deprecated ap_people table

ALTER TABLE apm.ap_elements DROP FOREIGN KEY ap_elements_ibfk_2;
ALTER TABLE apm.ap_ednotes DROP FOREIGN KEY ap_ednotes_ibfk_1;
ALTER TABLE apm.ap_mc_editions DROP FOREIGN KEY ap_mc_editions_author;
ALTER TABLE apm.ap_presets DROP FOREIGN KEY ap_presets_useridfk;
ALTER TABLE apm.ap_relations DROP FOREIGN KEY fk_userid;
ALTER TABLE apm.ap_tokens DROP FOREIGN KEY ap_user_id;
ALTER TABLE apm.ap_versions_tx DROP FOREIGN KEY ap_versions_tx_author;
ALTER TABLE apm.ap_works DROP FOREIGN KEY ap_works_ibfk_1;

UPDATE `ap_settings` SET `value` = '36' WHERE `ap_settings`.`setting` = 'DatabaseVersion';