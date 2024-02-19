<?php

namespace APM\CommandLine\Migration31to32;

use APM\CommandLine\CommandLineUtility;
use APM\System\ApmMySqlTableName;
use DateTime;
use ThomasInstitut\DataTable\InvalidRowForUpdate;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\DataTable\RowDoesNotExist;
use ThomasInstitut\EntitySystem\Tid;
use ThomasInstitut\TimeString\InvalidTimeZoneException;

class GenerateTids extends CommandLineUtility
{

    const baseTimeString = '2016-06-01 07:00:00.000000';


    /**
     * @throws InvalidTimeZoneException
     * @throws InvalidRowForUpdate
     * @throws RowDoesNotExist
     */
    public function main($argc, $argv): void
    {


        $doIt = ($argv[1] ?? '') === 'doIt';

        $dbConn = $this->getSystemManager()->getDbConnection();

        $tablesToUpdate = [
            ApmMySqlTableName::TABLE_PEOPLE,
            ApmMySqlTableName::TABLE_WORKS,
            ApmMySqlTableName::TABLE_EDITION_SOURCES,
        ];

        $dataTablesToUpdate = [];
        foreach ($tablesToUpdate as $tableName) {
            $realName = $this->getSystemManager()->getTableNames()[$tableName];
            $dataTablesToUpdate[] = new MySqlDataTable($dbConn, $realName, false);
        }

        $dataTablesToCheckForTidUsage = [];
        foreach ($dataTablesToUpdate as $dt) {
            $dataTablesToCheckForTidUsage[] = $dt;
        }
        $docTableName =  $this->getSystemManager()->getTableNames()[ApmMySqlTableName::TABLE_DOCS];
        $dataTablesToCheckForTidUsage[] = new MySqlDataTable($dbConn, $docTableName, true);

        $dt = DateTime::createFromFormat("Y-m-d H:i:s.u", self::baseTimeString);
        $baseTimestamp1000 = intval($dt->format('Uv'));
        $nowTimestamp1000 = round(microtime(true) * 1000);
        print "Base timestamp is $baseTimestamp1000, now is $nowTimestamp1000\n";
        foreach ($dataTablesToUpdate as $dataTable) {
            print "Assigning tids to table " . $dataTable->getName() . "\n";
            $rowsWithoutTidAssigned = $dataTable->findRows(['tid' => 0]);
            if ($rowsWithoutTidAssigned->count() === 0) {
                print "  all rows have tids already\n";
            }
            $maxAttempts = 100;
            foreach ($rowsWithoutTidAssigned as $row) {
                $tidGenerated = false;
                $numAttempts = 0;
                while (!$tidGenerated && $numAttempts < $maxAttempts) {
                    $tid = rand($baseTimestamp1000, $nowTimestamp1000);
                    if (!$this->isTidInUse($tid, $dataTablesToCheckForTidUsage)) {
                        $tidGenerated = true;
                        printf("  Assigning tid for id %d: %s ( %s)\n", $row['id'],
                            Tid::toBase36String($tid), Tid::toTimeString($tid));
                        if ($doIt) {
                            $row['tid'] = $tid;
                            $dataTable->updateRow($row);
                        }
                    }
                }
                if (!$tidGenerated) {
                    printf ("  (!) Could not assign tid to id " . $row['id']);
                }
            }
        }
    }


    private function isTidInUse(int $tid, array $tablesToCheck) : bool {
        foreach($tablesToCheck as $dt) {
            $rows = $dt->findRows(['tid' => $tid]);
            if (count($rows) > 0) {
                return true;
            }
        }
        return false;
    }

}