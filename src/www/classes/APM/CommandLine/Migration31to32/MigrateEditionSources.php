<?php

namespace APM\CommandLine\Migration31to32;

use APM\CommandLine\CommandLineUtility;
use APM\System\ApmMySqlTableName;
use ThomasInstitut\DataCache\InMemoryDataCache;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\DataTable\MySqlUnitemporalDataTable;
use ThomasInstitut\EntitySystem\Tid;
use ThomasInstitut\TimeString\TimeString;
use ThomasInstitut\UUID\Uuid;
use function DeepCopy\deep_copy;

class MigrateEditionSources extends CommandLineUtility
{


    public function main($argc, $argv): void
    {
        $dbConn = $this->systemManager->getDbConnection();
        $tableName = $this->systemManager->getTableNames()[ApmMySqlTableName::TABLE_EDITION_SOURCES];

        $doIt = $argv[1] === 'doIt';


        $editionSourcesDt = new MySqlDataTable($dbConn, $tableName, false);

        $rowsWithoutTid = $editionSourcesDt->findRows(['tid' => 0]);

        if (count($rowsWithoutTid) === 0) {
            print "Tids already assigned to edition sources\n";
        }

        foreach ($rowsWithoutTid as $row) {
            $tid = Tid::generateUnique();

            printf("Assigning tid for id %d: %s ( %s)\n", $row['id'],
                        Tid::toBase36String($tid), Tid::toTimeString($tid));
            if ($doIt) {
                $row['tid'] = $tid;
                $editionSourcesDt->updateRow($row);
            }
        }

        // build the uuid to tid conversion table

        $allSources = $editionSourcesDt->getAllRows();
        $conversionTable = new InMemoryDataCache();
        foreach($allSources as $source) {
            $uuidString = Uuid::bin2str($source['uuid']);
            $tid = $source['tid'];
            print "  UUID $uuidString ===> tid $tid\n";
            $conversionTable->set("source:$uuidString", "source:$tid");
        }


        // now migrate collation tables, this is almost brute force!
        $ctTableName = $this->systemManager->getTableNames()[ApmMySqlTableName::TABLE_COLLATION_TABLE];

        $result = $dbConn->query("select * from `$ctTableName` where `witnesses_json` like '%source:%'");

        print "Processing " . $result->rowCount() . " chunk editions with sources\n";

        $tablesProcessed = 0;
        foreach($result as $row) {
            $id = $row['id'];
            $validFrom = $row['valid_from'];
            $validUntil = $row['valid_until'];
            printf("  Table %d (%s to %s)...", $id, $validFrom, $validUntil);
            $isCompressed = intval($row['compressed']) === 1;
            if ($isCompressed) {
                $dataJson = gzuncompress($row['data']);
            } else {
                $dataJson = $row['data'];
            }
            $ctData = json_decode($dataJson, true);
            $witnesses = json_decode($row['witnesses_json']);
            $newWitnesses = [];
            foreach ($witnesses as $w) {
                if ($conversionTable->isInCache($w)) {
                    $newWitnesses[] = $conversionTable->get($w);
                } else {
                    $newWitnesses[] = $w;
                }
            }

            $newCtDataWitnesses = [];
            foreach ($ctData['witnesses'] as $witness) {
                $newWitness = deep_copy($witness);
                if ($conversionTable->isInCache($witness['ApmWitnessId'])) {
                    $newWitness['ApmWitnessId'] = $conversionTable->get($witness['ApmWitnessId']);
                }
                $newCtDataWitnesses[] = $newWitness;
            }

            $ctData['witnesses'] = $newCtDataWitnesses;

            if ($doIt) {
                print "saving...";
                $dataToSave = json_encode($ctData);
                if ($isCompressed) {
                    $dataToSave = gzcompress($dataToSave);
                }
                $dataToSave = $dbConn->quote($dataToSave);
                $newWitnessesJson =  json_encode($newWitnesses);
                $query = "update `$ctTableName` set `witnesses_json`= '$newWitnessesJson', `data`= $dataToSave " .
                  "WHERE `id` = $id and `valid_from`='$validFrom' and `valid_until`='$validUntil';" ;

                $dbConn->query($query);
                print "done";
            }
            print "\n";
        }






    }

}