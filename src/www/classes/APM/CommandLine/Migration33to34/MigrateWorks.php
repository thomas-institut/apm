<?php

namespace APM\CommandLine\Migration33to34;

use APM\CommandLine\CommandLineUtility;
use APM\EntitySystem\Schema\Entity;
use APM\EntitySystem\ValueToolBox;
use APM\System\ApmMySqlTableName;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\EntitySystem\StatementStorage;
use ThomasInstitut\EntitySystem\Tid;

class MigrateWorks extends CommandLineUtility
{

  public function main($argc, $argv): void
    {
        $systemManager = $this->getSystemManager();
        $dbConn = $systemManager->getDbConnection();
        $tableNames = $systemManager->getTableNames();
        $worksTableName = $tableNames[ApmMySqlTableName::TABLE_WORKS];
        $worksDataTable = new MySqlDataTable($dbConn, $worksTableName);


        $statementStorage = $systemManager->createDefaultStatementStorage();

        $creationTimestamp = strval(time());

        $statementMetadata = [
            [Entity::pStatementAuthor, Entity::System],
            [Entity::pStatementTimestamp, $creationTimestamp]
        ];

        $createdWorks = [];
        $es = $this->getSystemManager()->getEntitySystem();

        $dbConn->beginTransaction();

        foreach ($worksDataTable->getAllRows() as $row) {
            $workTid = $row['tid'];
            $title = $row['title'];
            $shortTitle = $row['short_title'];
            $dareId = $row['dare_id'];
            $author = intval($row['author_tid']);
            $enabled =  $row['enabled'] === '1';

            print "Importing work $workTid = $dareId: '$title'";

            try {
                $data = $es->getEntityData($workTid);
                print "... work $data->id already exists: " . $data->getObjectForPredicate(Entity::pEntityName) . "\n";
            } catch (EntityDoesNotExistException) {
                $commands = [];
                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                    $workTid, Entity::pEntityType, Entity::tWork, $statementMetadata];

                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                    $workTid, Entity::pEntityName, $title, $statementMetadata];

                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                    $workTid, Entity::pEntityCreationTimestamp, $creationTimestamp, $statementMetadata];

                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                    $workTid, Entity::pApmWorkId, $dareId, $statementMetadata];

                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                    $workTid, Entity::pWorkShortTitle, $shortTitle, $statementMetadata];

                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                    $workTid, Entity::pWorkAuthor, $author, $statementMetadata];

                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                    $workTid, Entity::pWorkIsEnabledInApm, ValueToolBox::boolToValue($enabled), $statementMetadata];

                $statementStorage->storeMultipleStatementsAndCancellations($commands);
                $createdWorks[] = $workTid;
            }
            print "\n";
        }

        $dbConn->commit();
        print "Checking data:\n";

        foreach ($createdWorks as $createdWork) {
            try {
                $es->getEntityData($createdWork);
            } catch (EntityDoesNotExistException) {
                print "ERROR: person $createdWork not found in entity system\n";
            }
        }
    }

}