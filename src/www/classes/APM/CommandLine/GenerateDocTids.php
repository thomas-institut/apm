<?php

namespace APM\CommandLine;

use APM\System\ApmMySqlTableName;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\EntitySystem\Tid;

class GenerateDocTids extends CommandLineUtility
{

    public function main($argc, $argv): void
    {
        $dbConn = $this->systemManager->getDbConnection();

        $docTable = $this->systemManager->getTableNames()[ApmMySqlTableName::TABLE_DOCS];

        if ($argc < 2) {
            print "Need bilderberg CSV file name\n";
            return;
        }

        $doIt = $argv[2] === 'doIt';

        $bilderbergData = [];

        $bilderbergCsvData = file_get_contents( $argv[1]);
        $lines = explode("\n", $bilderbergCsvData);
        foreach($lines as $line) {
            $bilderbergData[] = explode(',', $line);
        }

        print "Using data for " . count($bilderbergData) . " bilderberg documents.\n";


        $dataTable = new MySqlDataTable($dbConn, $docTable, true);

        $docsWithoutTid= $dataTable->findRows([ 'tid' => 0]);

        foreach($docsWithoutTid as $docRow) {
            $index = $this->getBilderbergDataIndex($bilderbergData, $docRow['image_source_data']);
            if ($index === -1) {
                $newTid = Tid::generateUnique();
                printf("Doc %d not in bilderberg, using new tid %s\n", $docRow['id'], Tid::toBase36String($newTid));
                $docRow['tid'] =  $newTid;
            } else {
                $creationTimeString = $bilderbergData[$index][1];
                $tid = -1;
                try {
                    $dt = \DateTime::createFromFormat("Y-m-d H:i:s.u", $creationTimeString);
                    $ts = intval($dt->format('Uv'))/1000;
                    if (floor($ts) == $ts) {
                        $ts +=  rand(1,999) / 1000;
                    }
                    $tid = Tid::fromTimestamp($ts);
                } catch (\Exception) {
                }
                if ($tid === -1) {
                    $tid = Tid::generateUnique();
                    printf("Bilderberg data for doc %d is wrong, using new tid %s\n", $docRow['id'], Tid::toBase36String($tid));
                } else {
                    printf("Assigning tid for doc %d based on bilderberg data: %s ( %s)\n", $docRow['id'],
                        Tid::toBase36String($tid), Tid::toTimeString($tid));
                }
                $docRow['tid'] =  $tid;
            }
            if ($doIt) {
                $dataTable->updateRow($docRow);
            }
        }

    }

    private function getBilderbergDataIndex($bilderbergData, $dareId) : int {
        for ($i = 0; $i < count($bilderbergData); $i++) {
            if ($bilderbergData[$i][0] === $dareId) {
                return $i;
            }
        }
        return -1;
    }
}