<?php

namespace APM\System\Factories;

use APM\EntitySystem\ApmEntitySystemInterface;
use APM\System\ApmTableNames;
use APM\System\Document\ApmDocumentManager;
use APM\System\Document\DocumentManager;
use Psr\Log\LoggerInterface;
use ThomasInstitut\DataTable\MySqlUnitemporalDataTable;
use ThomasInstitut\DataTable\PdoProvider\PdoProvider;

class DocumentManagerFactory
{

    public static function create(ApmEntitySystemInterface $entitySystem,
                                  PdoProvider $pdoProvider,
                                  ApmTableNames $tableNames,
                                  LoggerInterface $logger): DocumentManager
    {
        $dm =  new ApmDocumentManager(
            fn() => $entitySystem,
            fn() => new MySqlUnitemporalDataTable($pdoProvider, $tableNames->pages));
        $dm->setLogger($logger);
        return $dm;
    }
}