<?php

namespace APM\CommandLine\Migration31to32;

use APM\CommandLine\CommandLineUtility;
use APM\System\ApmMySqlTableName;
use PDO;
use ThomasInstitut\DataCache\InMemoryDataCache;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\DataTable\MySqlUnitemporalDataTable;
use ThomasInstitut\EntitySystem\Tid;
use ThomasInstitut\TimeString\InvalidTimeString;
use ThomasInstitut\TimeString\InvalidTimeZoneException;
use ThomasInstitut\TimeString\TimeString;
use ThomasInstitut\UUID\Uuid;
use function DeepCopy\deep_copy;

class ConvertDatabaseTimeStringsToUTC extends CommandLineUtility
{

    const timeStringsToIgnore = [
            '2016-06-01 00:00:00.000000',
            TimeString::END_OF_TIMES
        ];

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

        $doIt = $argv[1] === 'doIt';

        foreach ($unitemporalTableNames as $tableName) {
            $this->processTable($dbConn, $tableName, true, $doIt);
        }

        foreach($versionTableNames as $tableName) {
            $this->processTable($dbConn, $tableName, false, $doIt);
        }
    }

    /**
     * @throws InvalidTimeZoneException
     * @throws InvalidTimeString
     */
    private function processTable(PDO $dbConn, string $tableName, bool $uniTemporal, bool $doIt) : void {
        $result = $dbConn->query("SELECT * from `$tableName`");
        $numRows =  $result->rowCount();
        print "-- Processing $numRows rows in table $tableName\n";
        $fromField = $uniTemporal ? 'valid_from' : 'time_from';
        $untilField = $uniTemporal ? 'valid_until' : 'time_until';
        $rowsProcessed = 0;
        foreach($result as $row) {
            $id = $row['id'];
            $currentFrom = $row[$fromField];
            $currentUntil = $row[$untilField];

            $newFrom = !in_array($currentFrom, self::timeStringsToIgnore) ?
                TimeString::toNewTimeZone($currentFrom, 'UTC', 'Europe/Berlin') :
                $currentFrom;

            $newUntil = !in_array($currentUntil, self::timeStringsToIgnore) ?
                TimeString::toNewTimeZone($currentUntil, 'UTC', 'Europe/Berlin') :
                $currentUntil;
            if ($newFrom !== $currentFrom || $newUntil !== $currentUntil) {
                $rowsProcessed++;
                $query = "UPDATE `$tableName` SET `$fromField`='$newFrom', `$untilField`='$newUntil' WHERE `id`=$id AND `$fromField`='$currentFrom' AND `$untilField`='$currentUntil';";
                if ($doIt) {
                    if ( ($rowsProcessed % 10) === 0) {
                        print "   row $rowsProcessed\r";
                    }
                    $dbConn->query($query);
                } else {
                    print "$query\n";
                }
            }
        }
    }

}