<?php

namespace APM\CommandLine\Migration31to32;

use APM\CommandLine\CommandLineUtility;
use APM\System\ApmMySqlTableName;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\EntitySystem\Tid;

class GeneratePeopleTids extends CommandLineUtility
{

    const baseTimeString = '2016-06-01 09:00:00.000000';

    private ?array $tablesWithTids;

    public function __construct(array $config, int $argc, array $argv)
    {
        parent::__construct($config, $argc, $argv);

        $this->tablesWithTids = null;
    }

    public function main($argc, $argv): void
    {
        $dbConn = $this->systemManager->getDbConnection();

        $peopleTable = $this->systemManager->getTableNames()[ApmMySqlTableName::TABLE_PEOPLE];

        $doIt = $argv[1] === 'doIt';


        $peopleDataTable = new MySqlDataTable($dbConn, $peopleTable, false);

        $peopleWithoutTid = $peopleDataTable->findRows(['tid' => 0]);


        $dt = \DateTime::createFromFormat("Y-m-d H:i:s.u", self::baseTimeString);
        $baseTimestamp1000 = intval($dt->format('Uv'));
        $nowTimestamp1000 = round(microtime(true) * 1000);
        print "Base timestamp is $baseTimestamp1000, now is $nowTimestamp1000\n";

        $maxAttempts = 100;
        foreach ($peopleWithoutTid as $personRow) {
            $tidGenerated = false;
            $numAttempts = 0;
            while (!$tidGenerated && $numAttempts < $maxAttempts) {
                $tid = rand($baseTimestamp1000, $nowTimestamp1000);
                if (!$this->isTidInUse($tid)) {
                    $tidGenerated = true;
                    printf("Assigning tid for person %d: %s ( %s)\n", $personRow['id'],
                        Tid::toBase36String($tid), Tid::toTimeString($tid));
                    if ($doIt) {
                        $personRow['tid'] = $tid;
                        $peopleDataTable->updateRow($personRow);
                    }
                }
            }
            if (!$tidGenerated) {
                printf ("Could not assign tid to person " . $personRow['id']);
            }
        }
    }

    public function isTidInUse(int $tid) : bool {
        if ($this->tablesWithTids === null) {
            $dbConn = $this->systemManager->getDbConnection();
            $docTableName =  $this->systemManager->getTableNames()[ApmMySqlTableName::TABLE_DOCS];

            $this->tablesWithTids = [ new MySqlDataTable($dbConn, $docTableName, true)];
        }
        return TidChecker::isTidInUse($tid, $this->tablesWithTids);
    }

}