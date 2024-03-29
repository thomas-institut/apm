<?php

namespace APM\CommandLine\Migration32to33;

use APM\CommandLine\CommandLineUtility;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Schema\Entity;
use APM\System\Person\InvalidPersonNameException;
use APM\System\Person\PersonNotFoundException;
use APM\ToolBox\FullName;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\EntitySystem\Tid;


class ImportDarePeople extends CommandLineUtility
{

  public function main($argc, $argv): void {
      $systemManager = $this->getSystemManager();
      $dbConn = $systemManager->getDbConnection();
      $es = $systemManager->getEntitySystem();
      $pm = $systemManager->getPersonManager();
      $darePeopleTable = new MySqlDataTable($dbConn, 'dare_people_to_import', false, 'dare_id');

      $hotRun = false;
      if (isset($argv[1]) && $argv[1] === 'doIt') {
          $hotRun = true;
      }

      $creationTimestamp = strval(time());

      $statementMetadata = [
        [Entity::pStatementAuthor,  Entity::System],
        [Entity::pStatementTimestamp, $creationTimestamp]
      ];

//      $dbConn->beginTransaction();

      foreach ($darePeopleTable->getAllRows() as $row) {
        $name = $row['full_name'];
        print "Importing person '$name'...";
        $personTid = null;

        if ($row['tid'] !== null) {
            $personTid = $row['tid'];
            try {
                $this->getSystemManager()->getPersonManager()->getPersonEntityData($personTid);
                print "using tid $personTid in import table...";
            } catch (PersonNotFoundException) {
                print "... tid $personTid given in import table is not a person in Apm\n";
                $personTid = null;
            }
        }
        if ($personTid === null) {
            $personTid = $this->getPersonTidByName($name);
            if ($personTid !== null) {
                print "found person with same name in APM, tid $personTid (" . Tid::toBase36String($personTid) . ")";
            }
        }
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
            print "creating new with name '$name', sortName '$sortName'... ";
            if ($hotRun) {
                try {
                    $personTid = $pm->createPerson($name, $sortName);
                    print "tid $personTid (" . Tid::toBase36String($personTid) . ")... ";
                } catch (InvalidPersonNameException $e) {
                    print "Invalid name, skipping\n";
                    continue;
                }
            }
        }

        print "importing data... ";

        $dareId = $row['dare_id'];
        $viafUrl = $row['viaf_url'] ?? '';

        $viafId = 0;
        if ($viafUrl !== '') {
            $fields = explode('/', $viafUrl);
            $viafId = intval($fields[count($fields)-1]);
        }

        $dbUrl = $row['db_url'] ?? '';
        $dnbUrl = $row['dnb_url'] ?? '';

        print "DARE=$dareId ";
        if ($viafId !== 0) {
            print "VIAF=$viafId";
        }
        print " ...done\n";
      }

//      $dbConn->commit();


  }


  private function getPersonTidByName(string $name) : int|null  {

      $es = $this->getSystemManager()->getRawEntitySystem();

      $statements = $es->getStatements(null, Entity::pEntityName, trim($name));

      if (count($statements) === 0) {
          return null;
      }

//      var_dump($statements);

      [ , $tid] = $statements[0];

      return $tid;
  }



}