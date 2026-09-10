<?php

namespace APM\System\Factories;

use APM\EntitySystem\ApmEntitySystemInterface;
use APM\System\ApmTableNames;
use APM\System\Document\ApmDocumentManager;
use APM\System\Document\DocumentManager;
use ThomasInstitut\DataTable\MySqlUnitemporalDataTable;
use ThomasInstitut\DataTable\PdoProvider\PdoProvider;

class DocumentManagerFactory
{

    public static function create(ApmEntitySystemInterface $entitySystem, PdoProvider $pdoProvider, ApmTableNames $tableNames): DocumentManager
    {
        return new ApmDocumentManager(
            fn() => $entitySystem,
            fn() => new MySqlUnitemporalDataTable($pdoProvider, $tableNames->pages));
    }
}