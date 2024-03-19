<?php

namespace Test\ThomasInstitut\EntitySystem;

use PDO;

use ThomasInstitut\DataCache\MemcachedDataCache;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\EntitySystem\DataTableStatementStorage;
use ThomasInstitut\EntitySystem\EntityData;
use ThomasInstitut\EntitySystem\EntityDataCache\DataTableEntityDataCache;
use ThomasInstitut\EntitySystem\EntitySystem;
use ThomasInstitut\EntitySystem\EntitySystemWithMetadata;
use ThomasInstitut\EntitySystem\Exception\EntityDoesNotExistException;
use ThomasInstitut\EntitySystem\Exception\InvalidArgumentException;
use ThomasInstitut\EntitySystem\Exception\StatementNotFoundException;
use ThomasInstitut\EntitySystem\TypedMultiStorageEntitySystem;
use ThomasInstitut\EntitySystem\TypeStorageConfig;

require_once  __DIR__ .  "./../../test.config.php";

class TypedMultiStorageEntitySystemTest extends EntitySystemWithMetadataReferenceTestSuite
{

    const NumTypes = 10;
    const FirstTypeTid = 1001;
    const NumEntities = 200;

    const pIndex = 2500;
    const pRelatedTo = 2501;
    private PDO $pdo;

    /**
     * @throws InvalidArgumentException
     */
    public function getEntitySystemWithMetadata(): EntitySystemWithMetadata
    {
        global $testConfig;

        $dbConf = $testConfig['db'];
        $pdo = new PDO('mysql:dbname=' . $dbConf['db'] .
            ';host=' . $dbConf['host'],$dbConf['user'], $dbConf['pwd']);


        $pdo->query("set character set 'utf8'");
        $pdo->query("set names 'utf8'");

        $statementTableName = 'es_statements';
        $entityDataCacheTable = 'es_edc_default';
        $entityDataCacheTable_People = 'es_edc_people';
//        $memCacheTableName = 'es_mem_cache';


        $statementTableCreationQuery = <<<EOD
        drop table if exists `$statementTableName`;
        create table `$statementTableName` ( 
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

        create index subject on `$statementTableName`(subject);
EOD;

        $entityDataCacheCreationQuery = <<<EOD
        drop table if exists `$entityDataCacheTable`;
        create table `$entityDataCacheTable` ( 
            `id` int not null auto_increment primary key ,
            `tid` bigint not null,
            `dataId` text,
            `setAt` int,
            `expires` int,
            `data` text
            );
        create index tid on `$entityDataCacheTable`(tid);
        
        drop table if exists `$entityDataCacheTable_People`;
        create table `$entityDataCacheTable_People` ( 
            `id` int not null auto_increment primary key ,
            `tid` bigint not null,
            `dataId` text,
            `setAt` int,
            `expires` int,
            `name` varchar(512),
            `aliases` varchar(2048),
            `data` text
            );
        create index tid on `$entityDataCacheTable`(tid);
EOD;

//        $memCacheCreationQuery = <<<EOD
//        drop table if exists `$memCacheTableName`;
//        create table `$memCacheTableName` (
//            `id` int not null auto_increment primary key,
//            `cache_key` varchar(256),
//            `value` varchar(2048),
//            `set_at` DATETIME(6),
//            `expires` DATETIME(6)
//            ) engine = memory;
//EOD;
        $pdo->query($statementTableCreationQuery);
        $pdo->query($entityDataCacheCreationQuery);
//        $pdo->query($memCacheCreationQuery);


        $storage = new DataTableStatementStorage(new MySqlDataTable($pdo, $statementTableName, true), [
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
        $entityDataCache = new DataTableEntityDataCache(new MySqlDataTable($pdo, $entityDataCacheTable, true));
        $entityDataCachePeople = new DataTableEntityDataCache(
            new MySqlDataTable($pdo, $entityDataCacheTable_People, true),
            [
                'name' => function(EntityData $entityData) { return $entityData->getObjectForPredicate(self::pName);},
                'aliases' =>
                    function (EntityData $entityData) {
                        return implode(',', $entityData->getAllObjectsForPredicate(self::pAlias));
                    }
            ]
        );

        $memCache = new MemcachedDataCache();
        $defaultConfig = new TypeStorageConfig();
        $defaultConfig->withType(0)
            ->withStorage($storage)
            ->withDataCache($entityDataCache);

        $peopleConfig = new TypeStorageConfig();
        $peopleConfig->withType(self::tPerson)
            ->withStorage($storage)
            ->withDataCache($entityDataCachePeople);

        $someInt = time();
        $dataId = "ID$someInt";
        $prefix = "ID$someInt";

        $this->pdo = $pdo;

        return new TypedMultiStorageEntitySystem(self::pEntityType, [ $defaultConfig, $peopleConfig], $dataId, $memCache, $prefix);
    }


    /**
     * @throws EntityDoesNotExistException
     * @throws StatementNotFoundException
     */
    public function testBasic() : void {

        $profile = false;
        /** @var TypedMultiStorageEntitySystem $es */
        $es = $this->getEntitySystem();



        $author = $es->createEntity(self::tPerson, [ [ self::pName, "Test Author"]], [  [ self::pStatementAuthor, self::eSystem]]);

        $langs[] = $es->createEntity(self::tLang, [ [ self::pName, "German"]], [  [ self::pStatementAuthor, self::eSystem]]);
        $langs[] = $es->createEntity(self::tLang, [ [ self::pName, "Spanish"]], [  [ self::pStatementAuthor, self::eSystem]]);

        $types = [];

        for($i = 0; $i < self::NumTypes; $i++) {
            $types[] = self::FirstTypeTid + $i;
        }
        $entityDataArray = [];

        $numPeople = 1;
        for ($i=0; $i < self::NumEntities; $i++) {
            $type =  rand(0, 1000) > 500 ?  $types[rand(0, self::NumTypes-1)] : self::tPerson;
            $name = "Entity $i";
            if ($type=== self::tPerson) {
                $numPeople++;
                $name = "Person $numPeople";
            }
            $aliases = [];
            foreach($langs as $ignored) {
                $aliases[] =  "Alias" . rand(100000, 999999);
            }
            $entityDataArray[$i] = [
                'index' => $i,
                'type' => $type,
                'name' => $name,
                'relatedTo' => rand(0, self::NumEntities-1),
                'aliases' => $aliases
            ];
        }

        // create entities
        $start = microtime(true);
        $this->pdo->beginTransaction();
       foreach ($entityDataArray as $index => $entityData) {
           $tid = $es->createEntity($entityData['type'], [
               [ self::pName, $entityData['name']]
           ] , [
               [ self::pStatementAuthor, $author],
               [ self::pEditorialNote, "Creating entity " . $entityData['name']]
           ]);
           $entityDataArray[$index]['tid'] = $tid;
       }
       $this->pdo->commit();
        $duration = microtime(true) - $start;
        $profile && print  count($entityDataArray) . " entities created in " . $duration . "\n";

       foreach ($entityDataArray as $index => $entityData) {
           $data = $es->getEntityData($entityData['tid']);
           $this->assertEquals($entityData['type'], $data->getObjectForPredicate(self::pEntityType), "Testing entity index $index");
           $this->assertEquals($entityData['name'], $data->getObjectForPredicate(self::pName), "Testing entity index $index");
           $this->assertNull($data->getObjectForPredicate(self::pIndex), "Testing entity index $index");
           $this->assertNull($data->getObjectForPredicate(self::pRelatedTo), "Testing entity index $index");
           $this->assertNull($data->getObjectForPredicate(self::pAlias), "Testing entity index $index");
       }

       // make a ton of statements!

       $commands = [];
       foreach ($entityDataArray as $entityData) {
           $metadata = [
               [ self::pStatementAuthor, $author],
               [ self::pEditorialNote, "Modifying entity " . $entityData['name']]
           ];
           $relatedToTid = $entityDataArray[$entityData['relatedTo']]['tid'];
           $commands[] = [ EntitySystem::MakeStatementCommand, $entityData['tid'], self::pIndex, $entityData['index'], $metadata];
           $commands[] = [ EntitySystem::MakeStatementCommand, $entityData['tid'],  self::pRelatedTo, $relatedToTid, $metadata];
           foreach($entityData['aliases'] as $index => $alias) {
               $aliasMetadata = [
                   [ self::pStatementAuthor, $author],
                   [ self::pEditorialNote, "Adding alias to " . $entityData['name']],
                   [ self::pQualificationLang, $langs[$index] ?? -1]
               ];
               $commands[] = [ EntitySystem::MakeStatementCommand, $entityData['tid'],  self::pAlias, $alias, $aliasMetadata];
           }
       }

       $start = microtime(true);
       $es->makeMultipleStatementAndCancellations($commands);

       $duration = microtime(true) - $start;
        $profile && print  "\n" . count($commands) . " statements done in " . $duration . "\n";

        $start = microtime(true);
        foreach ($entityDataArray as $index => $entityData) {
            $data = $es->getEntityData($entityData['tid']);
            $this->assertEquals($entityData['index'], $data->getObjectForPredicate(self::pIndex), "Testing entity index $index");
            $relatedToTid = $entityDataArray[$entityData['relatedTo']]['tid'];
            $this->assertEquals($relatedToTid, $data->getObjectForPredicate(self::pRelatedTo), "Testing entity index $index");
            $aliases  = $data->getAllObjectsForPredicate(self::pAlias);
            $this->assertCount(count($entityData['aliases']), $aliases);
            foreach ($entityData['alias'] as $alias) {
                $this->assertContains($alias, $aliases);
            }
        }
        $duration = microtime(true) - $start;
        $profile && print count($entityDataArray) . " entities checked in " . $duration . "\n";

   }

}