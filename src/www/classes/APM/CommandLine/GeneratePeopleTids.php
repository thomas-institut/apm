<?php

namespace APM\CommandLine;

use APM\System\ApmMySqlTableName;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\EntitySystem\Tid;
use ThomasInstitut\TimeString\TimeString;

class GeneratePeopleTids extends CommandLineUtility
{

    const baseTimeString = '2016-06-01 09:00:00.000000';

    public function main($argc, $argv): void
    {
        $dbConn = $this->systemManager->getDbConnection();

        $peopleTable = $this->systemManager->getTableNames()[ApmMySqlTableName::TABLE_PEOPLE];

        $doIt = $argv[1] === 'doIt';


        $peopleDataTable = new MySqlDataTable($dbConn, $peopleTable, false);

        $peopleWithoutTid = $peopleDataTable->findRows(['tid' => 0]);


        $dt = \DateTime::createFromFormat("Y-m-d H:i:s.u", self::baseTimeString);
        $baseTimestamp = floatval($dt->format('Uv') / 1000);
        print "Base timestamp is $baseTimestamp\n";

        foreach ($peopleWithoutTid as $personRow) {
            $ts = $baseTimestamp + intval($personRow['id']);
            $tid = Tid::fromTimestamp($ts);
            printf("Assigning tid for person %d: %s ( %s)\n", $personRow['id'],
                Tid::toBase36String($tid), Tid::toTimeString($tid));
            if ($doIt) {
                $peopleDataTable->updateRow($personRow);
            }
        }

    }

}