<?php

namespace APM\CommandLine\Migration32to33;

use APM\CommandLine\CommandLineUtility;
use APM\EntitySystem\Schema\Entity;
use APM\System\ApmMySqlTableName;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\EntitySystem\StatementStorage;
use ThomasInstitut\EntitySystem\Tid;

class MigratePeople extends CommandLineUtility
{

  public function main($argc, $argv): void
    {
        $systemManager = $this->getSystemManager();
        $dbConn = $systemManager->getDbConnection();
        $tableNames = $systemManager->getTableNames();
        $peopleTableName = $tableNames[ApmMySqlTableName::TABLE_PEOPLE];
        $peopleDataTable = new MySqlDataTable($dbConn, $peopleTableName);


        $statementStorage = $systemManager->createDefaultStatementStorage();

        $creationTimestamp = strval(time());

        $statementMetadata = [
            [Entity::pStatementAuthor, Entity::System],
            [Entity::pStatementTimestamp, $creationTimestamp]
        ];

        $createdPeople = [];
        $es = $this->getSystemManager()->getEntitySystem();

        $dbConn->beginTransaction();

        foreach ($peopleDataTable->getAllRows() as $row) {
            $personTid = $row['tid'];
            $name = $row['name'];
            $sortName = $row['sort_name'];

            print "Importing person $personTid: '$name'";

            try {
                $data = $es->getEntityData($personTid);
                print "... person $data->id already exists: " . $data->getObjectForPredicate(Entity::pEntityName) . "\n";
            } catch (EntityDoesNotExistException) {
                $commands = [];
                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                    $personTid, Entity::pEntityType, Entity::tPerson, $statementMetadata];

                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                    $personTid, Entity::pEntityName, $name, $statementMetadata];

                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                    $personTid, Entity::pEntityCreationTimestamp, $creationTimestamp, $statementMetadata];

                $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                    $personTid, Entity::pSortName, $sortName, $statementMetadata];
                $statementStorage->storeMultipleStatementsAndCancellations($commands);
                $createdPeople[] = $personTid;
            }
            print "\n";
        }

        $dbConn->commit();
        print "Checking data:\n";

        foreach ($createdPeople as $createdPerson) {
            try {
                $es->getEntityData($createdPerson);
            } catch (EntityDoesNotExistException) {
                print "ERROR: person $createdPerson not found in entity system\n";
            }
        }
    }

}