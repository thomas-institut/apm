<?php

namespace APM\System\Factories;

use APM\MultiChunkEdition\ApmMultiChunkEditionManager;
use APM\MultiChunkEdition\MultiChunkEditionManager;
use APM\System\ApmContainerKey;
use APM\System\ApmMySqlTableName;
use APM\System\DataTableSchema\MceDataTableSchemaProvider;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Log\LoggerInterface;
use RuntimeException;
use ThomasInstitut\DataTable\Exception\InvalidArgumentException;
use ThomasInstitut\DataTable\Exception\InvalidColumnDefinitionsArray;
use ThomasInstitut\DataTable\MySqlUnitemporalDataTable;
use ThomasInstitut\DataTable\MySqlUnitemporalDataTableWithSchema;
use ThomasInstitut\DataTable\PdoProvider\PdoProvider;

class MultiChunkEditionManagerFactory
{

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public static function create(ContainerInterface $ci): MultiChunkEditionManager {
        try {
            /** @var LoggerInterface $logger */
            $logger = $ci->get(LoggerInterface::class);
            /** @var array<string, string> $tableNames */
            $tableNames = $ci->get(ApmContainerKey::TABLE_NAMES);
            /** @var PdoProvider $pdoProvider */
            $pdoProvider = $ci->get(PdoProvider::class);
            $mceTable = new MySqlUnitemporalDataTable($pdoProvider, $tableNames[ApmMySqlTableName::TABLE_MULTI_CHUNK_EDITIONS]);
            $mceTableWithSchema = new MySqlUnitemporalDataTableWithSchema($mceTable, MceDataTableSchemaProvider::getSchema());
            return new ApmMultiChunkEditionManager($mceTableWithSchema, $logger);
        } catch (InvalidArgumentException|InvalidColumnDefinitionsArray $e) {
            // should never happen
            throw new RuntimeException("Could not create multi chunk edition manager: " . $e->getMessage(), $e->getCode(), $e);
        }
    }
}