<?php

namespace APM\CommandLine\Migration32to33;

use APM\CommandLine\CommandLineUtility;
use APM\System\ApmMySqlTableName;
use APM\System\EntitySystem\Exception\Exception\Exception\ApmEntitySystemInterface;
use APM\System\EntitySystem\Exception\Exception\Exception\EntityDoesNotExistException;
use APM\System\EntitySystem\Exception\Exception\Exception\EntityType;
use APM\System\EntitySystem\Exception\Exception\Exception\PersonPredicate;
use APM\System\EntitySystem\Exception\Exception\Exception\SystemPredicate;
use APM\System\Person\InvalidPersonNameException;
use APM\ToolBox\FullName;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\EntitySystem\StatementStorage;
use ThomasInstitut\EntitySystem\Tid;

class ImportDarePeople extends CommandLineUtility
{

  public function main($argc, $argv): void {
      $systemManager = $this->getSystemManager();
      $dbConn = $systemManager->getDbConnection();
      $es = $systemManager->getEntitySystem();
      $pm = $systemManager->getPersonManager();
      $darePeopleTable = new MySqlDataTable($dbConn, 'dare_people_to_import');

      $creationTimestamp = strval(time());

      $statementMetadata = [
        [SystemPredicate::StatementAuthor, ApmEntitySystemInterface::SystemEntity],
        [SystemPredicate::StatementTimestamp, $creationTimestamp]
      ];

      $createdPeople = [];

      $dbConn->beginTransaction();

      foreach ($darePeopleTable->getAllRows() as $row) {
        $name = $row['full_name'];
        print "Importing person '$name'...";

        $personTid = $this->getPersonTidByName($name);
        if ($personTid === null) {
            // get sort name
            $lastName = $row['last_name'] ?? '';
            if ($lastName !== '') {
                $sortName = $lastName;
                $firstName = $row['first_name'] ?? '';
                if ($firstName !== '') {
                    $sortName .= ", $firstName";
                }
            } else {
               $sortName = FullName::getSortName($name, true);
            }
            try {
                $personTid = $pm->createPerson($name, $sortName);
            } catch (InvalidPersonNameException $e) {
                print "Invalid name, skipping\n";
                continue;
            }
        }
        try {
            $currentData = $es->getEntityData($personTid);
        } catch (EntityDoesNotExistException $e) {
            print "Unexpected error: entity does not exist\n";
            return;
        }



        print "\n";
      }

      $dbConn->commit();


  }


  private function getPersonTidByName(string $name) : int|null  {

      $es = $this->getSystemManager()->getRawEntitySystem();

      $statements = $es->getStatements(null, SystemPredicate::EntityName, $name);

      if (count($statements) === 0) {
          return null;
      }

      [ , $tid] = $statements[0];

      return $tid;
  }



}