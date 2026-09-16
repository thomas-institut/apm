<?php

namespace APM\System\Factories;

use APM\CollationTable\ApmCollationTableManager;
use APM\CollationTable\ApmCollationTableVersionManager;
use APM\CollationTable\CollationTableManager;
use APM\System\ApmTableNames;
use Psr\Log\LoggerInterface;
use ThomasInstitut\DataTable\Exception\InvalidArgumentException;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\DataTable\MySqlUnitemporalDataTable;
use ThomasInstitut\DataTable\PdoProvider\PdoProvider;

class CollationTableManagerFactory
{

    /**
     * @throws InvalidArgumentException
     */
    public static function create(PdoProvider $pdoProvider, ApmTableNames $tableNames, LoggerInterface $logger): CollationTableManager
    {
        $ctTable = new MySqlUnitemporalDataTable($pdoProvider, $tableNames->cTables);
        $ctVersionsTable = new MySqlDataTable($pdoProvider, $tableNames->ctVersions);
        $ctVersionManager = new ApmCollationTableVersionManager($ctVersionsTable);
        $ctVersionManager->setLogger($logger);
        return new ApmCollationTableManager($ctTable, $ctVersionManager, $logger);
    }
}