<?php

namespace APM\System\Factories;

use APM\EntitySystem\ApmEntitySystem;
use APM\EntitySystem\Schema\Entity;
use APM\System\ApmTableNames;
use Predis\Client;
use Psr\Log\LoggerInterface;
use RuntimeException;
use ThomasInstitut\DataTable\DataTable;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\DataTable\PdoProvider\PdoProvider;
use ThomasInstitut\EntitySystem\DataTableStatementStorage;
use ThomasInstitut\EntitySystem\EntityData;
use ThomasInstitut\EntitySystem\EntityDataCache\DataTableEntityDataCache;
use ThomasInstitut\EntitySystem\Exception\InvalidArgumentException;
use ThomasInstitut\EntitySystem\StatementStorage;
use ThomasInstitut\EntitySystem\TypedMultiStorageEntitySystem;
use ThomasInstitut\EntitySystem\TypeStorageConfig;
use ThomasInstitut\ValkeyDataCache\ValkeyDataCache;

class ApmEntitySystemFactory
{
    // Entity system Data ID: key for entity system caches
    const string ES_DATA_ID = '0010'; // 2026 Jan 9

    private const string MemCachePrefix_Apm_ES = 'Es';
    const string MemCachePrefix_TypedMultiStorage_ES = 'MsEs';
    private const int DefaultMemCacheTtl = 24 * 3600;  // 1 day

    private ValkeyDataCache $memDataCache;


    public static function create(LoggerInterface $logger,
                                  PdoProvider     $pdoProvider,
                                  ApmTableNames   $tableNames,
                                  Client          $valkeyClient): ApmEntitySystem {
        return (new self($logger, $pdoProvider, $tableNames, $valkeyClient))->getEntitySystem();
    }

    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly PdoProvider     $pdoProvider,
        private readonly ApmTableNames   $tableNames,
        private readonly Client          $valkeyClient
    )
    {
        $this->memDataCache = new ValkeyDataCache('APM:Mem:', $this->valkeyClient);
        $this->memDataCache->setDefaultTtl(self::DefaultMemCacheTtl);

    }

    public function getEntitySystem(): ApmEntitySystem
    {
        $apmEntitySystem = new ApmEntitySystem(
            fn(): TypedMultiStorageEntitySystem => $this->getRawEntitySystem(),
            fn(): DataTable => new MySqlDataTable($this->pdoProvider, $this->tableNames->esMerges, true),
            $this->memDataCache,
            self::MemCachePrefix_Apm_ES
        );
        $apmEntitySystem->setLogger($this->logger);
        return $apmEntitySystem;
    }

    public function getRawEntitySystem(): TypedMultiStorageEntitySystem
    {
        $defaultConfig = new TypeStorageConfig();
        $defaultConfig->withType(0);
        $defaultConfig->statementStorageCallable = fn(): StatementStorage => $this->createDefaultStatementStorage();
        $defaultConfig->useCache = true;
        $defaultConfig->entityDataCacheCallable = function () {
            $defaultEntityDataCacheDataTable = new MySqlDataTable($this->pdoProvider, $this->tableNames->esCacheDefault);
            return new DataTableEntityDataCache(
                $defaultEntityDataCacheDataTable,
                [
                    'name' => function (EntityData $entityData) {
                        return $entityData->getObjectForPredicate(Entity::pEntityName);
                    },
                    'type' =>
                        function (EntityData $entityData) {
                            return $entityData->getObjectForPredicate(Entity::pEntityType);
                        }
                ]
            );
        };

        $defaultConfig->useMemCache = true;

        try {
            $typedMultiStorageEntitySystem = new TypedMultiStorageEntitySystem(
                Entity::pEntityType, [$defaultConfig],
                self::ES_DATA_ID,
                $this->memDataCache,
                self::MemCachePrefix_TypedMultiStorage_ES . ':' . self::ES_DATA_ID
            );
            $typedMultiStorageEntitySystem->setLogger($this->logger);
            return $typedMultiStorageEntitySystem;
        } catch (InvalidArgumentException) {
            throw new RuntimeException("Bad entity system configuration");
        }
    }

    public function createDefaultStatementStorage(): StatementStorage
    {
        $defaultStatementDataTable = new MySqlDataTable($this->pdoProvider,
            $this->tableNames->esStatementsDefault);
        return new DataTableStatementStorage($defaultStatementDataTable, [
            'author' => Entity::pStatementAuthor,
            "timestamp" => ['predicate' => Entity::pStatementTimestamp, 'forceLiteralValue' => true],
            'edNote' => Entity::pStatementEditorialNote,
            'cancelledBy' => ['predicate' => Entity::pCancelledBy, 'cancellationMetadata' => true],
            'cancellationTs' => ['predicate' => Entity::pCancellationTimestamp, 'cancellationMetadata' => true, 'forceLiteralValue' => true],
        ]);
    }

}