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

class GenerateWorkTids extends CommandLineUtility
{
    const baseTimeString = '2016-06-01 09:00:00.000000';

    /**
     * @var MySqlDataTable[]|null
     */
    private ?array $tablesWithTids;

    public function __construct(array $config, int $argc, array $argv)
    {
        parent::__construct($config, $argc, $argv);
        $this->tablesWithTids = null;
    }


    public function main($argc, $argv): void
    {
        $dbConn = $this->systemManager->getDbConnection();
        $tableName = $this->systemManager->getTableNames()[ApmMySqlTableName::TABLE_WORKS];

        $doIt = $argv[1] === 'doIt';


        $worksDt = new MySqlDataTable($dbConn, $tableName, false);

        $rowsWithoutTid = $worksDt->findRows(['tid' => 0]);

        if (count($rowsWithoutTid) === 0) {
            print "Tids already assigned to works\n";
        }

        $dt = \DateTime::createFromFormat("Y-m-d H:i:s.u", self::baseTimeString);
        $baseTimestamp1000 = intval($dt->format('Uv'));
        $nowTimestamp1000 = round(microtime(true) * 1000);
        print "Base timestamp is $baseTimestamp1000, now is $nowTimestamp1000\n";

        $maxAttempts = 100;
        foreach ($rowsWithoutTid as $row) {
            $tidGenerated = false;
            $numAttempts = 0;
            while (!$tidGenerated && $numAttempts < $maxAttempts) {
                $tid = rand($baseTimestamp1000, $nowTimestamp1000);
                if (!$this->isTidInUse($tid)) {
                    $tidGenerated = true;
                    printf("Assigning tid for work %d: %s ( %s)\n", $row['id'],
                        Tid::toBase36String($tid), Tid::toTimeString($tid));
                    if ($doIt) {
                        $row['tid'] = $tid;
                        $worksDt->updateRow($row);
                    }
                }
            }
            if (!$tidGenerated) {
                printf ("Could not assign tid to work " . $row['id']);
            }
        }
    }


    public function isTidInUse(int $tid) : bool {
        if ($this->tablesWithTids === null) {
            $dbConn = $this->systemManager->getDbConnection();
            $docTableName =  $this->systemManager->getTableNames()[ApmMySqlTableName::TABLE_DOCS];
            $peopleTableName = $this->systemManager->getTableNames()[ApmMySqlTableName::TABLE_PEOPLE];

            $this->tablesWithTids = [
                new MySqlDataTable($dbConn, $docTableName, true),
                new MySqlDataTable($dbConn, $peopleTableName, true),
            ];
        }
        return TidChecker::isTidInUse($tid, $this->tablesWithTids);
    }

}