<?php

namespace APM\System\EntitySystem;

use APM\System\ApmMySqlTableName;
use LogicException;
use PDO;
use RuntimeException;
use ThomasInstitut\DataCache\DataCache;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\EntitySystem\DataTableStatementStorage;
use ThomasInstitut\EntitySystem\EntityData;
use ThomasInstitut\EntitySystem\EntityDataCache\DataTableEntityDataCache;
use ThomasInstitut\EntitySystem\EntityDataCache\EntityDataCache;
use ThomasInstitut\EntitySystem\EntityDataCache\EntityNotInCacheException;
use ThomasInstitut\EntitySystem\Exception\StatementAlreadyCancelledException;
use ThomasInstitut\EntitySystem\Exception\StatementNotFoundException;
use ThomasInstitut\EntitySystem\MultiStorageEntitySystem;
use ThomasInstitut\EntitySystem\StatementData;
use ThomasInstitut\EntitySystem\StatementStorage;

/**
 * The heart of Apm's entity system storage
 *
 * Some entity types have their own statement storage and ach
 *
 */
class ApmMultiStorageEntitySystem extends MultiStorageEntitySystem
{

    const CachePrefixEntityType = 'T';

    private EntityDataCache $defaultEntityDataCache;
    /**
     * @var EntityDataCache[]
     */
    private array $entityDataCaches;
    /**
     * @var StatementStorage[]
     */
    private array $statementStorages;
    private DataCache $memCache;
    private string $memCachePrefix;

    public function __construct(PDO $pdo, array $tableNames, DataCache $memCache, string $memCachePrefix = 'APM_MS_ES')
    {
        $defaultStorage = new DataTableStatementStorage(new MySqlDataTable($pdo, $tableNames[ApmMySqlTableName::ES_Statements_Default]), []);
        parent::__construct($defaultStorage);
        $this->defaultEntityDataCache = new DataTableEntityDataCache(new MySqlDataTable($pdo, $tableNames[ApmMySqlTableName::ES_Cache_Default]));

        // storages and caches are associated with entity types
        $this->statementStorages = [];
        $this->statementStorages[0] = $defaultStorage;

        $this->entityDataCaches = [];
        $this->entityDataCaches[0] = $this->defaultEntityDataCache;

        $this->memCache = $memCache;
        $this->memCachePrefix = $memCachePrefix;
    }

    private function getMemCacheKey(string $type, int $tid) : string {

        return "$this->memCachePrefix-$type-$tid";
    }

    /**
     * Tries to determine an entity's type
     *
     * @param int $tid
     * @return int
     * @throws EntityDoesNotExistException
     */
    public function getEntityType(int $tid) : int {

        try {
            return intval($this->memCache->get($this->getMemCacheKey(self::CachePrefixEntityType, $tid)));
        } catch (KeyNotInCacheException) {
            $type = $this->getEntityData($tid)->getObjectForPredicate(SystemPredicate::EntityType);
            $this->memCache->set($this->getMemCacheKey(self::CachePrefixEntityType, $tid), $type);
            return $type;
        }
    }

    public function createEntity(int $entityType, string $name, int $authorTid, string $description = '', int $ts = -1): int
    {
        $newEntityTid = $this->generateUniqueEntityId();
        if ($ts=== -1) {
            $ts = time();
        }

        $metadata = [
            [ SystemPredicate::StatementAuthor, $authorTid],
            [ SystemPredicate::StatementTimestamp, $ts]
        ];

        $commands = [];

        $commands[] = [
            StatementStorage::StoreStatementCommand,
            $this->generateUniqueEntityId(),
            $newEntityTid,
            SystemPredicate::EntityType,
            $entityType,
            $metadata
        ];

        $commands[] = [
            StatementStorage::StoreStatementCommand,
            $this->generateUniqueEntityId(),
            $newEntityTid,
            SystemPredicate::EntityName,
            $name,
            $metadata
        ];

        $commands[] = [
            StatementStorage::StoreStatementCommand,
            $this->generateUniqueEntityId(),
            $newEntityTid,
            SystemPredicate::EntityCreationTimestamp,
            $ts,
            $metadata
        ];

        if ($description !== '') {
            $commands[] = [
                StatementStorage::StoreStatementCommand,
                $this->generateUniqueEntityId(),
                $newEntityTid,
                SystemPredicate::EntityDescription,
                $description,
                $metadata
            ];
        }

        $this->getStatementStorageForType($entityType)->storeMultipleStatementsAndCancellations($commands);

        // get the data so that it gets cached
        try {
            $this->getEntityData($newEntityTid);
        } catch (EntityDoesNotExistException) {
            // should never happen
            throw new RuntimeException("Could not get data from newly created entity $newEntityTid");
        }



        return $newEntityTid;
    }

    /**
     * @throws EntityDoesNotExistException
     */
    public function getEntityData(int $entity): EntityData
   {
       foreach($this->entityDataCaches as $entityDataCache) {
           try {
               return $entityDataCache->getData($entity);
           } catch (EntityNotInCacheException) {
           }
       }

       $parentData = parent::getEntityData($entity);

       if(count($parentData->statements) === 0) {
           throw new EntityDoesNotExistException();
       }

       $type = $parentData->getObjectForPredicate(SystemPredicate::EntityType);
       if ($type === -1) {
           throw new LogicException("No type found for entity $entity");
       }
       $this->getEntityDataCacheForType($type)->setData($entity, $parentData, ApmEntitySystem::dataId, ApmEntitySystem::defaultEntityDataTtl);
       $this->memCache->set($this->getMemCacheKey(self::CachePrefixEntityType, $entity), $type);
       return $parentData;
   }

   private function getEntityDataCacheForType(int $type) : EntityDataCache {
        return $this->entityDataCaches[$type] ?? $this->defaultEntityDataCache;
    }

    private function getStatementStorageForType(int $type) : StatementStorage {
        return $this->statementStorages[$type] ?? $this->defaultStorage;
    }

    /**
     * @throws EntityDoesNotExistException
     */
    protected function getStorageForStatement(int $subject, int $predicate, int|string $object): StatementStorage
    {
        $subjectType = $this->getEntityType($subject);
        return $this->statementStorages[$subjectType];
    }

    /**
     * @throws StatementNotFoundException
     */
   public function getStatementById(int $statementTid) : StatementData {
       foreach($this->getAllStorages() as $storage) {
            try {
                return $this->getStatementDataFromStatementArray($storage->retrieveStatement($statementTid));
            } catch (StatementNotFoundException) {

            }
       }
       throw new StatementNotFoundException();
  }

  public function getAllTidsForType(int $type) : array {
       $storage = $this->getStatementStorageForType($type);
       $statements = $storage->findStatements(null, SystemPredicate::EntityType, $type);
       $tids = [];
       foreach($statements as $statement) {
           $tids[] = $statement[1];
       }
       return $tids;
  }

    /**
     * @throws StatementNotFoundException
     * @throws StatementAlreadyCancelledException
     * @throws StatementNotFoundException
     */
    public function cancelStatementWithMetadata(int $statementId, $metadata): int
  {
      $statementDataBeforeCancellation = $this->getStatementById($statementId);

      $cancellationId = parent::cancelStatementWithMetadata($statementId, $metadata);
      try {
          $subjectType = $this->getEntityType($statementDataBeforeCancellation->subject);
          $this->getEntityDataCacheForType($subjectType)->invalidateData($statementDataBeforeCancellation->subject);
          if (is_int($statementDataBeforeCancellation->object)) {
              $objectType = $this->getEntityType($statementDataBeforeCancellation->object);
              $this->getEntityDataCacheForType($objectType)->invalidateData($statementDataBeforeCancellation->object);
          }
      } catch (EntityDoesNotExistException $e) {
          // should never happen
          throw new RuntimeException("Entity does not exist exception: " . $e->getMessage());
      }

      return  $cancellationId;
  }


}