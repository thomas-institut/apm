<?php

namespace APM\CommandLine\Migration32to33;

use APM\CommandLine\CommandLineUtility;
use APM\System\ApmMySqlTableName;
use APM\System\EntitySystem\ApmEntitySystemInterface;
use APM\System\EntitySystem\EntityDoesNotExistException;
use APM\System\EntitySystem\EntityType;
use APM\System\EntitySystem\PersonPredicate;
use APM\System\EntitySystem\SystemPredicate;
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
            [SystemPredicate::StatementAuthor, ApmEntitySystemInterface::SystemEntity],
            [SystemPredicate::StatementTimestamp, $creationTimestamp]
        ];

        $createdPeople = [];

        $dbConn->beginTransaction();

        foreach ($peopleDataTable->getAllRows() as $row) {
            $personTid = $row['tid'];
            $name = $row['name'];
            $sortName = $row['sort_name'];

            print "Importing person $personTid: '$name'";
            $commands = [];

            $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                            $personTid, SystemPredicate::EntityType, EntityType::Person, $statementMetadata];

            $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                $personTid, SystemPredicate::EntityName, $name, $statementMetadata];

            $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                $personTid, SystemPredicate::EntityCreationTimestamp, $creationTimestamp, $statementMetadata];

            $commands[] = [ StatementStorage::StoreStatementCommand, Tid::generateUnique(),
                $personTid, PersonPredicate::SortName, $sortName, $statementMetadata];
            $statementStorage->storeMultipleStatementsAndCancellations($commands);
            $createdPeople[] = $personTid;
            print "\n";
        }

        $dbConn->commit();


        $es = $this->getSystemManager()->getEntitySystem();

        print "Checking data:\n";

        foreach ($createdPeople as $createdPerson) {
            try {
                $data = $es->getEntityData($createdPerson);
//                print "Person $data->id: " . $data->getObjectForPredicate(SystemPredicate::EntityName) . "\n";
            } catch (EntityDoesNotExistException) {
                print "ERROR: person $createdPerson not found in entity system\n";
            }
        }
    }

}