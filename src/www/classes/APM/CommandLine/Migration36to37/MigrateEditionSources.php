<?php

namespace APM\CommandLine\Migration36to37;

use APM\CommandLine\CommandLineUtility;
use APM\EntitySystem\Schema\Entity;
use APM\System\ApmMySqlTableName;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\EntitySystem\StatementStorage;
use ThomasInstitut\EntitySystem\Tid;

class MigrateEditionSources extends CommandLineUtility
{

  public function main($argc, $argv): void
    {
        $systemManager = $this->getSystemManager();
        $dbConn = $systemManager->getDbConnection();
        $editionSourcesDataTable = new MySqlDataTable($dbConn, $systemManager->getTableNames()[ApmMySqlTableName::TABLE_EDITION_SOURCES]);
        $statementStorage = $systemManager->createDefaultStatementStorage();
        $creationTimestamp = strval(time());
        $statementMetadata = [
            [Entity::pStatementAuthor, Entity::System],
            [Entity::pStatementTimestamp, $creationTimestamp]
        ];
        $createdSources = [];
        $es = $this->getSystemManager()->getEntitySystem();

        $dbConn->beginTransaction();

        foreach ($editionSourcesDataTable->getAllRows() as $row) {
            $dbId = strval($row['id']);
            $tid = $row['tid'];
            $name = trim($row['title']);
            $description = trim($row['description'] ?? '');
            $defaultSiglum = trim($row['default_siglum'] ?? '');
            print "Importing source $tid = $dbId: '$name'";
            try {
                $data = $es->getEntityData($tid);
                print "... source $data->id already exists: " . $data->getObjectForPredicate(Entity::pEntityName) . "\n";
            } catch (EntityDoesNotExistException) {
                $commands = [];
                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                    $tid, Entity::pEntityType, Entity::tGenericEditionSource, $statementMetadata];

                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                    $tid, Entity::pEntityName, $name, $statementMetadata];

                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                    $tid, Entity::pEntityCreationTimestamp, $creationTimestamp, $statementMetadata];

                if ($description !== '') {
                    $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                        $tid, Entity::pEntityDescription, $description, $statementMetadata];
                }
                if ($defaultSiglum !== '') {
                    $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                        $tid, Entity::pDefaultSiglum, $defaultSiglum, $statementMetadata];
                }
//                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
//                    $tid, Entity::pLegacyApmDatabaseId, $dbId, $statementMetadata];
                $statementStorage->storeMultipleStatementsAndCancellations($commands);
                $createdSources[] = $tid;
            }
            print "\n";
        }

        $dbConn->commit();
        print "Checking data:\n";

        foreach ($createdSources as $createdSource) {
            try {
                $es->getEntityData($createdSource);
            } catch (EntityDoesNotExistException) {
                print "ERROR: source $createdSource not found in entity system\n";
            }
        }
    }

}