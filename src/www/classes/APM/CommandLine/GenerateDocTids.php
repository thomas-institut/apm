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

        $dt = new MySqlDataTable($dbConn, $docTable, true);

        $docsWithoutTid= $dt->findRows([ 'tid' => 0]);

        foreach($docsWithoutTid as $docRow) {
            $docRow['tid'] = Tid::generateUnique();
           $dt->updateRow($docRow);
        }

    }
}