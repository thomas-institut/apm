<?php

namespace APM\CommandLine\Migration31to32;

use APM\CommandLine\CommandLineUtility;
use APM\System\ApmMySqlTableName;
use PDO;
use ThomasInstitut\DataTable\MySqlDataTable;

class MigrateAuthorIdsInCollationTables extends CommandLineUtility
{

    public function main($argc, $argv): void
    {
        $dbConn = $this->systemManager->getDbConnection();
        $peopleTableName = $this->systemManager->getTableNames()[ApmMySqlTableName::TABLE_PEOPLE];
        print "Loading new people Tids...";
        $idConversionTable = $this->getId2TidTable($dbConn, $peopleTableName);
        print "done\n";

        $doIt = $argv[1] === 'doIt';

        // now migrate collation tables, this is almost brute force!
        $ctTableName = $this->systemManager->getTableNames()[ApmMySqlTableName::TABLE_COLLATION_TABLE];

        print "Loading collations tables...";
        $result = $dbConn->query("select * from `$ctTableName`");
        print "done\n";

        $numTables = $result->rowCount();
        $maxTablesToProcess = 20000;
        print "Processing max. $maxTablesToProcess of $numTables collation tables\n";
        $tablesProcessed = 0;
        $tablesWithChanges = 0;
        foreach($result as $row) {
            if ($tablesProcessed > $maxTablesToProcess) {
                break;
            }
            $id = $row['id'];
            $validFrom = $row['valid_from'];
            $validUntil = $row['valid_until'];
//            printf("  %d of %d: Table %d (%s to %s)...", $tablesProcessed+1, $numTables, $id, $validFrom, $validUntil);
            $isCompressed = intval($row['compressed']) === 1;
            if ($isCompressed) {
                $dataJson = gzuncompress($row['data']);
            } else {
                $dataJson = $row['data'];
            }
            $ctData = json_decode($dataJson, true);
            $witnesses = $ctData['witnesses'];
            $changes = false;
            $newWitnesses = [];
            foreach($witnesses as $witness) {
                if (isset($witness['items'])) {
                    $newItems = [];
                    foreach ($witness['items'] as $item) {
                        if (isset($item['notes'])) {

                            $newNotes = [];
                            foreach ($item['notes'] as $note) {
                                if (isset($note['authorId'])) {
                                    $changes = true;
                                    $note['authorTid'] = $idConversionTable[$note['authorId']];
                                    unset($note['authorId']);
                                }
                                $newNotes[] = $note;
                            }
                            $item['notes'] = $newNotes;
                        }
                        $newItems[] = $item;
                    }
                    $witness['items'] = $newItems;
                }
                $newWitnesses[] = $witness;
            }

            if ($changes) {
                $tablesWithChanges++;
                printf("  %d of %d: Table %d (%s to %s)...", $tablesProcessed+1, $numTables, $id, $validFrom, $validUntil);
                print "saving changes...";
                if ($doIt) {
                    $ctData['witnesses'] = $newWitnesses;
                    $dataToSave = json_encode($ctData);
                    if ($isCompressed) {
                        $dataToSave = gzcompress($dataToSave);
                    }
                    $dataToSave = $dbConn->quote($dataToSave);
                    $query = "update `$ctTableName` set `data`= $dataToSave " .
                        "WHERE `id` = $id and `valid_from`='$validFrom' and `valid_until`='$validUntil';" ;
                    $dbConn->query($query);
                    print "done\n";
                } else {
                    print "cold run, skipping\n";
                }
            }
            $tablesProcessed++;
        }
        print "$tablesWithChanges tables with changes\n";
    }

    private function getId2TidTable(PDO $pdo, string $peopleTableName) : array {

        $dt = new MySqlDataTable($pdo, $peopleTableName);

        $allRows = $dt->getAllRows();

        $conversionTable = [];
        foreach($allRows as $row) {
            $id = intval($row['id']);
            $tid = intval($row['tid']);
            $conversionTable[$id] = $tid;
        }
        return $conversionTable;
    }

}