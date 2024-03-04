<?php

namespace Test\ThomasInstitut\EntitySystem;

use PDO;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\EntitySystem\DataTableStatementStorage;
use ThomasInstitut\EntitySystem\EntitySystemWithMetadata;
use ThomasInstitut\EntitySystem\MultiStorageEntitySystem;

require_once  __DIR__ .  "./../../test.config.php";

class MultiStorageEntitySystemTest extends EntitySystemWithMetadataReferenceTestSuite
{

    public function getEntitySystemWithMetadata(): EntitySystemWithMetadata
    {
        global $testConfig;

        $dbConf = $testConfig['db'];
        $pdo = new PDO('mysql:dbname=' . $dbConf['db'] .
            ';host=' . $dbConf['host'],$dbConf['user'], $dbConf['pwd']);
        $pdo->query("set character set 'utf8'");
        $pdo->query("set names 'utf8'");

        $table = 'min_entity_system';
        $creationQuery = <<<EOD
        drop table if exists `$table`;
        create table `$table` ( 
            `id` int not null auto_increment primary key ,
            `statementId` bigint,
            `subject` bigint,
            `predicate` bigint,
            `object` bigint,
            `value` text,
            `lang` bigint default null,
            `author` bigint default null,
            `ts` int default null,
            `edNote` text default null, 
            `extraStMetadata` text default null,
            `cancellationId` bigint default null,
            `cancelledBy` bigint default null,
            `extraCancMetadata` text default null
            );

        create index subject on `$table`(subject);
EOD;


        $pdo->query($creationQuery);
        $storage = new DataTableStatementStorage(new MySqlDataTable($pdo, $table, true), [
            'lang' => self::pQualificationLang,
            'author' => self::pStatementAuthor,
            "ts" => self::pStatementTimeStamp,
            'edNote'=> self::pEditorialNote,
            'cancelledBy' => [ 'predicate' => self::pCancellationAuthor, 'cancellationMetadata' => true ]
            ],
            [
                DataTableStatementStorage::StatementMetadataCol => 'extraStMetadata',
                DataTableStatementStorage::CancellationMetadataCol => 'extraCancMetadata'
            ]
        );
        return new MultiStorageEntitySystem($storage);
    }
}