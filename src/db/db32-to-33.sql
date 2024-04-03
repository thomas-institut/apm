

# Drop foreign key that ties users to rows in the people table
#  (the people table will disappear soon)
ALTER TABLE `ap_users` DROP FOREIGN KEY fk_user_people;
ALTER TABLE `ap_tokens` DROP FOREIGN KEY ap_tokens_ibfk_1;

ALTER TABLE `ap_tokens` ADD CONSTRAINT `ap_user_id` FOREIGN KEY (`user_tid`) REFERENCES `ap_users`(`tid`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `ap_jobs` ADD `signature` VARCHAR(128) NOT NULL DEFAULT '\'\'' AFTER `id`;

# Create default statement table
CREATE TABLE `ap_es_default_st` (
    `id` int not null auto_increment primary key ,
    `statementId` bigint not null,
    `subject` bigint not null,
    `predicate` bigint not null,
    `object` bigint,
    `value` text,
    `author` bigint,
    `timestamp` int,
    `edNote` text,
    `statementMetadata` longtext default null,
    `cancellationId` bigint default null,
    `cancelledBy` bigint default null,
    `cancellationTs` int default null,
    `cancellationMetadata` longtext default null
);

CREATE INDEX `subject` ON `ap_es_default_st`(subject);


CREATE table `ap_es_default_cache` (
    `id` int not null auto_increment primary key,
    `dataId` varchar(256),
    `setAt` int,
    `expires` int,
    `tid` bigint not null,
    `type` bigint,
    `name` text,
    `data` longtext
);
CREATE index tid on `ap_es_default_cache`(dataId, tid);


CREATE TABLE `ap_es_merges` (
    `id` int not null auto_increment primary key,
    `entity` bigint not null,
    `mergedInto` bigint
);

CREATE INDEX entity on `ap_es_merges` (entity);

# Run:
#     migrate_people
#     apmctl user updateEntitySystem doIt

UPDATE `ap_settings` SET `value` = '33' WHERE `ap_settings`.`setting` = 'DatabaseVersion';