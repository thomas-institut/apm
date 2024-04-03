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

    public function main($argc, $argv): void
    {
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


//      $dbConn->beginTransaction();

        foreach ($darePeopleTable->getAllRows() as $row) {
            $name = $row['full_name'];
            print "Importing person '$name':\n";
            $personTid = null;

            if ($row['tid'] !== null) {
                $personTid = $row['tid'];
                try {
                    $this->getSystemManager()->getPersonManager()->getPersonEntityData($personTid);
                    print "  Using tid $personTid in import table\n";
                } catch (PersonNotFoundException) {
                    print "  (!) Tid $personTid given in import table is not a person in Apm\n";
                    $personTid = null;
                }
            }
            if ($personTid === null) {
                $personTid = $this->getPersonTidByName($name);
                if ($personTid !== null) {
                    print "   Found person with same name in APM, tid $personTid (" . Tid::toBase36String($personTid) . ")\n";
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
                print "   Creating new with name '$name', sortName '$sortName'... ";
                if ($hotRun) {
                    try {
                        $personTid = $pm->createPerson($name, $sortName);
                    } catch (InvalidPersonNameException $e) {
                        print "Invalid name, skipping\n";
                        continue;
                    }
                } else {
                    $personTid = Tid::generateUnique();
                }
                print "tid $personTid (" . Tid::toBase36String($personTid) . ")\n";
            }

            $dataToImport = [];

            $dbUrl = $row['db_url'] ?? '';

            $dataToImport[] = [
                'name' => 'DB url',
                'predicate' => Entity::pUrl,
                'object' => strval($dbUrl),
                'metadata' => [Entity::pStUrlType, Entity::UrlTypeDb],
                'overwrite' => true
            ];

            $dnbUrl = $row['dnb_url'] ?? '';
            $dataToImport[] = [
                'name' => 'DNB url',
                'predicate' => Entity::pUrl,
                'object' => strval($dnbUrl),
                'metadata' => [Entity::pStUrlType, Entity::UrlTypeDnb],
                'overwrite' => true
            ];

            $dareId = $row['dare_id'];
            $dataToImport[] = [
                'name' => 'DARE Person id',
                'predicate' => Entity::pDarePersonId,
                'object' => strval($dareId),
                'overwrite' => true
            ];

            $viafUrl = $row['viaf_url'] ?? '';
            $dataToImport[] = [
                'name' => 'VIAF url',
                'predicate' => Entity::pUrl,
                'object' => strval($viafUrl),
                'metadata' => [Entity::pStUrlType, Entity::UrlTypeViaf],
                'overwrite' => true
            ];

            $viafId = 0;
            if ($viafUrl !== '') {
                $fields = explode('/', $viafUrl);
                $viafId = intval($fields[count($fields) - 1]);
            }

            $dataToImport[] = [
                'name' => 'VIAF id',
                'predicate' => Entity::pExternalId,
                'object' => strval($viafId),
                'metadata' => [Entity::pStIdType, Entity::IdTypeViaf],
                'overwrite' => true
            ];




            try {
                $currentData = $es->getEntityData($personTid);
            } catch (EntityDoesNotExistException) {
                if ($hotRun) {
                    print "ERROR: person $personTid not found\n";
                    return;
                } else {
                    $currentData = null;
                }
            }

            foreach ($dataToImport as $data) {
                if ($data['object'] === '' || $data['object'] === 'NULL') {
                    continue;
                }
                if (!isset($data['metadata'])) {
                    $currentObject = $currentData?->getObjectForPredicate($data['predicate']);
                } else {
                    $currentObject = $currentData?->getObjectForPredicate($data['predicate'], $data['metadata'][0], $data['metadata'][1]);
                }

                if ($currentObject !== $data['object']) {
                    print "   " . $data['name'] . ' (' . $data['predicate'] . ') : ' . $data['object'];
                    if (isset($data['metadata'])) {
                        print " ( " . implode(' -> ', $data['metadata']) . " )";
                    }
                    if ($data['overwrite']) {
                        print ", overwriting current value $currentObject";
                    }
                    print "\n";
                    if ($hotRun) {
                        $metadata = isset($data['metadata']) ? [ $data['metadata']] : [];
                        if ($currentObject === null) {
                            $es->makeStatement($personTid, $data['predicate'], $data['object'],
                                Entity::System, 'Importing from DARE', $metadata);
                        } else {
                            // TODO: implement this!
                        }
                    }
                }
            }
        }

//      $dbConn->commit();


    }


    private function getPersonTidByName(string $name): int|null
    {

        $es = $this->getSystemManager()->getRawEntitySystem();

        $statements = $es->getStatements(null, Entity::pEntityName, trim($name));

        if (count($statements) === 0) {
            return null;
        }

//      var_dump($statements);

        [, $tid] = $statements[0];

        return $tid;
    }

}