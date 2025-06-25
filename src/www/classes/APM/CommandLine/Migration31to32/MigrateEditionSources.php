<?php

namespace APM\CommandLine\Migration31to32;

use APM\CommandLine\CommandLineUtility;
use APM\System\ApmMySqlTableName;
use ThomasInstitut\DataCache\InMemoryDataCache;
use ThomasInstitut\DataCache\ItemNotInCacheException;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\ToolBox\Uuid;
use function DeepCopy\deep_copy;

class MigrateEditionSources extends CommandLineUtility
{


    /**
     * @throws ItemNotInCacheException
     */
    public function main($argc, $argv): void
    {
        $dbConn = $this->getSystemManager()->getDbConnection();
        $tableName = $this->getSystemManager()->getTableNames()[ApmMySqlTableName::TABLE_EDITION_SOURCES];

        $doIt = $argv[1] === 'doIt';


        $editionSourcesDt = new MySqlDataTable($dbConn, $tableName, false);

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
        $ctTableName = $this->getSystemManager()->getTableNames()[ApmMySqlTableName::TABLE_COLLATION_TABLE];

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