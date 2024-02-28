<?php

namespace Test\ThomasInstitut\EntitySystem;

use ThomasInstitut\DataTable\InMemoryDataTable;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\EntitySystem\MinimalEntitySystem;
use ThomasInstitut\EntitySystem\MultiDataTableMinimalEntitySystem;

require_once  __DIR__ .  "./../../test.config.php";

class MultiDataTableMinimalEntitySystemTest extends MinimalEntitySystemTestCase
{

    public function getEntitySystem(): MinimalEntitySystem
    {
        global $testConfig;

        $dbConf = $testConfig['db'];
        $pdo = new \PDO('mysql:dbname=' . $dbConf['db'] .
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
            `cancellationId` bigint default null
            );
EOD;


        $pdo->query($creationQuery);
        return new MultiDataTableMinimalEntitySystem([ new MySqlDataTable($pdo, $table, true)]);
    }
}