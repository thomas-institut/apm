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
            `author` bigint,
            `timestamp` int,
            `editorialNote` text, 
            `cancellationId` bigint default null,
            `statementMetadata` text default null,
            `cancellationMetadata` text default null
            );

        create index subject on `$table`(subject);
EOD;


        $pdo->query($creationQuery);
        $storage = new DataTableStatementStorage(new MySqlDataTable($pdo, $table, true), [
            'author' => 201,
            "timestamp" => 202,
            'editorialNote'=> 203
        ]);
        return new MultiStorageEntitySystem($storage);
    }
}