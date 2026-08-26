<?php

namespace APM\System\Factories;

use APM\MultiChunkEdition\ApmMultiChunkEditionManager;
use APM\MultiChunkEdition\MultiChunkEditionManager;
use APM\System\ApmTableNames;
use APM\System\DataTableSchema\MceDataTableSchemaProvider;
use Psr\Log\LoggerInterface;
use RuntimeException;
use ThomasInstitut\DataTable\Exception\InvalidArgumentException;
use ThomasInstitut\DataTable\Exception\InvalidColumnDefinitionsArray;
use ThomasInstitut\DataTable\MySqlUnitemporalDataTable;
use ThomasInstitut\DataTable\MySqlUnitemporalDataTableWithSchema;
use ThomasInstitut\DataTable\PdoProvider\PdoProvider;

class MultiChunkEditionManagerFactory
{
    public static function create(LoggerInterface $logger, ApmTableNames $tableNames, PdoProvider $pdoProvider): MultiChunkEditionManager
    {
        try {
            $mceTable = new MySqlUnitemporalDataTable($pdoProvider, $tableNames->mcEditions);
            $mceTableWithSchema = new MySqlUnitemporalDataTableWithSchema($mceTable, MceDataTableSchemaProvider::getSchema());
            return new ApmMultiChunkEditionManager($mceTableWithSchema, $logger);
        } catch (InvalidArgumentException|InvalidColumnDefinitionsArray $e) {
            // should never happen
            throw new RuntimeException("Could not create multi chunk edition manager: " . $e->getMessage(), $e->getCode(), $e);
        }
    }
}