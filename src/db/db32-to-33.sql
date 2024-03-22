

# Drop foreign key that ties users to rows in the people table
#  (the people table will disappear soon)
ALTER TABLE `ap_users` DROP FOREIGN KEY fk_user_people;


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

UPDATE `ap_settings` SET `value` = '33' WHERE `ap_settings`.`setting` = 'DatabaseVersion';