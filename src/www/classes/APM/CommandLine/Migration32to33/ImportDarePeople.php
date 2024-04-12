<?php

namespace APM\CommandLine\Migration32to33;

use APM\CommandLine\CommandLineUtility;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Exception\PredicateCannotBeCancelledException;
use APM\EntitySystem\Exception\StatementAlreadyCancelledException;
use APM\EntitySystem\Exception\StatementNotFoundException;
use APM\EntitySystem\Schema\Entity;
use APM\System\Person\InvalidPersonNameException;
use APM\System\Person\PersonNotFoundException;
use APM\ToolBox\FullName;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\EntitySystem\EntityData;
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
                'metadata' => [Entity::pObjectUrlType, Entity::UrlTypeDb],
                'overwrite' => true
            ];

            $dnbUrl = $row['dnb_url'] ?? '';
            $dataToImport[] = [
                'name' => 'DNB url',
                'predicate' => Entity::pUrl,
                'object' => strval($dnbUrl),
                'metadata' => [Entity::pObjectUrlType, Entity::UrlTypeDnb],
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
            $viafUrl = rtrim(trim($viafUrl), '/');
            $dataToImport[] = [
                'name' => 'VIAF url',
                'predicate' => Entity::pUrl,
                'object' => $viafUrl,
                'metadata' => [Entity::pObjectUrlType, Entity::UrlTypeViaf],
                'overwrite' => true
            ];

            $viafId = '0';
            if ($viafUrl !== '') {
                $fields = explode('/', $viafUrl);
                $viafId = $fields[count($fields) - 1];
            }
            if ($viafId !== '0') {
                $dataToImport[] = [
                    'name' => 'VIAF id',
                    'predicate' => Entity::pViafId,
                    'object' => $viafId,
                    'overwrite' => true
                ];
            }



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

                $currentObject = $currentData?->getObjectForPredicate($data['predicate'],
                    $data['metadata'][0] ?? null, $data['metadata'][1] ?? null);

                if ($currentObject !== $data['object']) {
                    print "   " . $data['name'] . ' (' . $data['predicate'] . ') : ' . $data['object'];
                    if (isset($data['metadata'])) {
                        print " ( " . implode(' -> ', $data['metadata']) . " )";
                    }
                    if ($data['overwrite']) {
                        print ", overwriting current value $currentObject";
                    }
                    $metadata = isset($data['metadata']) ? [ $data['metadata']] : [];
                    if ($currentObject !== null) {
                        $statementId = $this->getStatementId($currentData, $data['predicate'],
                            $data['metadata'][0] ?? null, $data['metadata'][1] ?? null);
                        if ($statementId === -1) {
                            print "  Error: could not find statement id\n";
                            continue;
                        }
                        print ", statement id $statementId";
                        if ($hotRun) {
                            try {
                                $es->cancelStatement($statementId, Entity::System, -1, "Value updated during DARE import");
                            } catch (PredicateCannotBeCancelledException|StatementAlreadyCancelledException|StatementNotFoundException) {
                                print "  Error: could not cancel statement $statementId\n";
                                continue;
                            }
                        }
                    }
                    if ($hotRun) {
                        $es->makeStatement($personTid, $data['predicate'], $data['object'],
                            Entity::System, 'Imported from DARE', $metadata);
                    }
                    print "\n";
                }
            }
        }

//      $dbConn->commit();


    }

    private function getStatementId(EntityData $entityData, int $predicate, ?int $qPredicate, ?int $qObject) : int {
        foreach($entityData->statements as $statement) {
            if ($statement->predicate === $predicate) {
                if ($qPredicate !== null && $qObject !== null) {
                    foreach($statement->statementMetadata as [ $metadataPredicate, $metadataObject ]) {
                        if ($metadataPredicate === $qPredicate && $metadataObject === $qObject) {
                            return $statement->id;
                        }
                    }
                } else {
                    return $statement->id;
                }
            }
        }
        return -1;
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