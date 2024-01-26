<?php

namespace APM\CommandLine\Migration31to32;

use APM\CommandLine\CommandLineUtility;
use APM\System\ApmMySqlTableName;
use PDO;
use ThomasInstitut\TimeString\InvalidTimeString;
use ThomasInstitut\TimeString\InvalidTimeZoneException;
use ThomasInstitut\TimeString\TimeString;

class ConvertDatabaseTimeStringsToUTC extends CommandLineUtility
{

    const timeStringsToIgnore = [
            '2016-06-01 00:00:00.000000',
            TimeString::END_OF_TIMES
        ];

    const queriesPerTransaction = 5000;

    /**
     * @throws InvalidTimeString
     * @throws InvalidTimeZoneException
     */
    public function main($argc, $argv): void
    {
        $dbConn = $this->systemManager->getDbConnection();
        $tableNames = $this->systemManager->getTableNames();

        $unitemporalTableNames = [
            $tableNames[ApmMySqlTableName::TABLE_COLLATION_TABLE],
            $tableNames[ApmMySqlTableName::TABLE_MULTI_CHUNK_EDITIONS],
            $tableNames[ApmMySqlTableName::TABLE_ELEMENTS],
            $tableNames[ApmMySqlTableName::TABLE_ITEMS],
            $tableNames[ApmMySqlTableName::TABLE_PAGES]
        ];

        $versionTableNames = [
          $tableNames[ApmMySqlTableName::TABLE_VERSIONS_CT],
          $tableNames[ApmMySqlTableName::TABLE_VERSIONS_TX]
        ];

        $tablesToFix = [
            [ 'tableName' => $tableNames[ApmMySqlTableName::TABLE_EDNOTES],  'timeStringColumns' => ['time']]
        ];
//        $tablesToFix = [];

        foreach($unitemporalTableNames as $tableName) {
            $tablesToFix[] = [
                'tableName' => $tableName,
                'timeStringColumns' => [ 'valid_from', 'valid_until']
            ];
        }

        foreach($versionTableNames as $tableName) {
            $tablesToFix[] = [
                'tableName' => $tableName,
                'timeStringColumns' => [ 'time_from', 'time_until']
            ];
        }



        $doIt = $argv[1] === 'doIt';

        foreach ($tablesToFix as $table) {
            $this->processTable($dbConn, $table['tableName'], $table['timeStringColumns'], $doIt);
        }
    }

    /**
     * @throws InvalidTimeZoneException
     * @throws InvalidTimeString
     */
    private function processTable(PDO $dbConn, string $tableName, array $timeStringColumns, bool $doIt) : void {
        $result = $dbConn->query("SELECT * from `$tableName`");
        $numRows =  $result->rowCount();
        print "-- Processing $numRows rows in table $tableName, fixing columns: " . implode(', ', $timeStringColumns) . "\n";

        $rowsProcessed = 0;
        $queriesInTransaction = 0;
        if ($doIt) {
            $dbConn->query("START TRANSACTION;");
        }
        foreach($result as $row) {
            $id = $row['id'];
            $updatedColumns = [];
            foreach($timeStringColumns as $column) {
                $currentValue = $row[$column];
                $newValue = !in_array($currentValue, self::timeStringsToIgnore) ?
                    TimeString::toNewTimeZone($currentValue, 'UTC', 'Europe/Berlin') :
//                    TimeString::toNewTimeZone($currentValue, 'Europe/Berlin', 'UTC') :
                    $currentValue;

                $updatedColumns[] = [$column, $currentValue, $newValue];
            }

            $sqlSets = [];
            foreach($updatedColumns as $update) {
                [ $col, $currentValue, $newValue] = $update;
                if ($newValue !== $currentValue) {
                    $sqlSets[] = "`$col`='$newValue'";
                }
            }
            if (count($sqlSets) > 0) {
                $rowsProcessed++;
                // there are changes in the column
                $whereConditions = [ "`id`=$id"];
                foreach($updatedColumns as $update) {
                    [ $col, $currentValue, $newValue] = $update;
                    $whereConditions[] = "`$col`='$currentValue'";
                }
                $query = sprintf("UPDATE `$tableName` SET %s WHERE %s;",
                    implode(', ', $sqlSets),
                    implode(' AND ', $whereConditions)
                );
                if ($doIt) {
                    if ( ($rowsProcessed % 100) === 0) {
                        print "   row $rowsProcessed\r";
                    }
                    $dbConn->query($query);
                    $queriesInTransaction++;
                    if ($queriesInTransaction > self::queriesPerTransaction) {
                        $dbConn->query('COMMIT;');
                        $dbConn->query("START TRANSACTION;");
                        $queriesInTransaction = 0;
                    }
                } else {
                    print "$query\n";
                }
            }
        }
        if ($doIt && $queriesInTransaction !== 0) {
            $dbConn->query('COMMIT;');
        }
    }

}