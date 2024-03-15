<?php

namespace ThomasInstitut\EntitySystem;


use LogicException;
use RuntimeException;
use ThomasInstitut\DataCache\DataCache;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\EntitySystem\EntityDataCache\EntityDataCache;
use ThomasInstitut\EntitySystem\EntityDataCache\EntityNotInCacheException;
use ThomasInstitut\EntitySystem\Exception\EntityDoesNotExistException;
use ThomasInstitut\EntitySystem\Exception\InvalidArgumentException;
use ThomasInstitut\EntitySystem\Exception\StatementAlreadyCancelledException;
use ThomasInstitut\EntitySystem\Exception\StatementNotFoundException;


/**
 * An entity system with multiple storages where data is partitioned
 * according to the object of a specific relation that each entity
 * has.
 *
 * In the context of this class, this predicate is called
 * the entity's type, but in principle it can be any predicate.
 *
 * In the constructor, the different statement storages and entity caches are
 * assigned to individual types, with a default storage and cache for unassigned
 * types.
 *
 *
 *
 */
class TypedMultiStorageEntitySystem extends MultiStorageEntitySystem
{

    protected DataCache $memCache;
    protected string $memCachePrefix;
    protected int $typePredicate;
    protected string $cacheDataId;
    /**
     * @var TypeStorageConfig[]
     */
    protected array $typeConfig;

    /**
     * TTL for cached entity types. It can be a very long time since
     * an entity's type must not change. It should not be zero so that the
     * cache can eventually free up space by getting rid of entities not queried
     * recently.
     */
    const MemCacheTypeTtl = 90 * 24 * 3600; // 3 months

    /**
     * Constructs an entity system using the given $typePredicate as the predicate
     * that assigns a type to an entity and storage and cache configuration
     * given in the config array.
     *
     * The $config array consists of an element for each entity type that should be stored in a different storage or
     * cached in a different entity data cache. Each element is a TypeStorageConfig object.
     *
     * Configuration for type 0 is the default configuration for types not found in the rest of elements in the
     * $config array and MUST be present.
     *
     * All caches use the given $cacheDataId.
     *
     * The class requires also a fast in-memory cache for efficient entity type lookups, which can be with other
     * classes by given a unique prefix for all entries.
     *
     * @param int $typePredicate
     * @param TypeStorageConfig[] $typeConfig
     * @param string $cacheDataId
     * @param DataCache $memCache
     * @param string $memCachePrefix
     * @throws InvalidArgumentException
     */
    public function __construct(int $typePredicate, array $typeConfig, string $cacheDataId, DataCache $memCache, string $memCachePrefix)
    {
        $this->typePredicate = $typePredicate;
        $this->cacheDataId = $cacheDataId;
        $this->typeConfig = $this->getCleanTypeConfig($typeConfig);
        $this->memCache = $memCache;
        $this->memCachePrefix = $memCachePrefix;
    }


    /**
     * @param TypeStorageConfig[] $config
     * @return array
     * @throws InvalidArgumentException
     */
    protected function getCleanTypeConfig(array $config) : array {
        /** @var TypeStorageConfig[] $typeConfig */
        $typeConfig = [];
        foreach ($config as $configEntry) {
            $typeConfig[$configEntry->type] = $config;
        }
        if (!isset($typeConfig[0])) {
            throw new InvalidArgumentException("No default configuration found");
        }
        $defaultConfig = $typeConfig[0];

        $defaultTtl = 0;
        if (!is_null($defaultConfig->ttl)) {
            $defaultTtl = $defaultConfig->ttl;
        }

        foreach(array_keys($typeConfig) as $type) {
            if ($type === 0 || !$typeConfig[$type]->useCache) {
                continue;
            }

            if (is_null($typeConfig[$type]->ttl)) {
                $typeConfig[$type]->withTtl($defaultTtl);
            }
        }

        return $typeConfig;
    }


    private function getMemCacheKey(int $tid) : string {
        return "$this->memCachePrefix-T-$tid";
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
            return intval($this->memCache->get($this->getMemCacheKey($tid)));
        } catch (KeyNotInCacheException) {
            $type = $this->getEntityData($tid)->getObjectForPredicate($this->typePredicate);
            $this->memCache->set($this->getMemCacheKey($tid), $type);
            return $type;
        }
    }

    /**
     * Creates an entity in the system with the given entity type by making the statement:
     *
     *     newEntityId  typePredicate entityType
     *
     * The system will also make the statements given in $extraCreationStatements at the same time.
     * Each element in $extraCreationStatements is a duple:
     *
     *   [  predicate, objectOrValue ]
     *
     * the subject is the newly created entity.
     *
     * The given $metadata is used for all statements.
     *
     * @param int $entityType
     * @param array $extraCreationStatements
     * @param array $metadata
     * @return int
     */
    public function createEntity(int $entityType, array $extraCreationStatements = [], array $metadata = []): int
    {
        $newEntityTid = $this->generateUniqueEntityId();

        $commands = [];

        $commands[] = [
            StatementStorage::StoreStatementCommand,
            $this->generateUniqueEntityId(),
            $newEntityTid,
            $this->typePredicate,
            $entityType,
            $metadata
        ];

        foreach($extraCreationStatements as $creationStatement) {
            [ $predicate, $object] = $creationStatement;
            $commands[] = [
                StatementStorage::StoreStatementCommand,
                $this->generateUniqueEntityId(),
                $newEntityTid,
                $predicate,
                $object,
                $metadata
            ];
        }

//        $commands[] = [
//            StatementStorage::StoreStatementCommand,
//            $this->generateUniqueEntityId(),
//            $newEntityTid,
//            SystemPredicate::EntityName,
//            $name,
//            $metadata
//        ];
//
//        $commands[] = [
//            StatementStorage::StoreStatementCommand,
//            $this->generateUniqueEntityId(),
//            $newEntityTid,
//            SystemPredicate::EntityCreationTimestamp,
//            $ts,
//            $metadata
//        ];
//
//        if ($description !== '') {
//            $commands[] = [
//                StatementStorage::StoreStatementCommand,
//                $this->generateUniqueEntityId(),
//                $newEntityTid,
//                SystemPredicate::EntityDescription,
//                $description,
//                $metadata
//            ];
//        }

        $typeConfig = $this->typeConfig[$entityType] ?? $this->typeConfig[0];
        $typeConfig->storage->storeMultipleStatementsAndCancellations($commands);

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
     * @inheritdoc
     */
    protected function getAllStorages() : array {
        $storages = [];
        foreach($this->typeConfig as $config) {
            $storages[] = $config->storage;
        }
        return $storages;
    }


    /**
     * @inheritdoc
     */
    protected function getStorageForStatementId(int $statementId) : StatementStorage {
        foreach ($this->getAllStorages() as $storage) {
            try {
                $storage->retrieveStatement($statementId);
                return $storage;
            } catch (StatementNotFoundException) {
            }
        }
        throw new StatementNotFoundException();
    }

    /**
     * @throws EntityDoesNotExistException
     */
    public function getEntityData(int $entity): EntityData
   {
       $entityData = parent::getEntityData($entity);

       if(count($entityData->statements) === 0) {
           throw new EntityDoesNotExistException();
       }
       return $entityData;
   }

   private function getEntityDataCacheForType(int $type) : ?EntityDataCache {
        $typeConfig = $this->typeConfig[$type] ?? $this->typeConfig[0];
        return $typeConfig->useCache ? $typeConfig->entityDataCache : null;
    }

    private function getStatementStorageForType(int $type) : StatementStorage {
        return isset($this->typeConfig[$type]) ? $this->typeConfig[$type]->storage : $this->typeConfig[0]->storage;
    }

    /**
     * @throws EntityDoesNotExistException
     */
    protected function getStorageForStatement(int $subject, int $predicate, int|string $object): StatementStorage
    {
        $subjectType = $this->getEntityType($subject);
        $typeConfig = $this->typeConfig[$subjectType] ?? $this->typeConfig[0];
        return $typeConfig->storage;
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
       $statements = $storage->findStatements(null, $this->typePredicate, $type);
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

          $subjectCache = $this->getEntityDataCacheForType($subjectType);
          if (!is_null($subjectCache)) {
              $subjectCache->invalidateData($statementDataBeforeCancellation->subject);
          }
          if (is_int($statementDataBeforeCancellation->object)) {
              $objectType = $this->getEntityType($statementDataBeforeCancellation->object);
              $objectCache = $this->getEntityDataCacheForType($objectType);
              if (!is_null($objectCache)) {
                  $objectCache->invalidateData($statementDataBeforeCancellation->object);
              }
          }
      } catch (EntityDoesNotExistException $e) {
          // should never happen
          throw new RuntimeException("Entity does not exist exception: " . $e->getMessage());
      }

      return  $cancellationId;
  }


    public function generateUniqueEntityId(): int
    {
        return Tid::generateUnique();
    }

    /**
     * @inheritDoc
     */
    protected function getEntityDataFromCache(int $entityId): EntityData
    {
        foreach ($this->typeConfig as $typeConfig) {
            if ($typeConfig->useCache) {
                try {
                    return $typeConfig->entityDataCache->getData($entityId, $this->cacheDataId);
                }catch (EntityNotInCacheException) {
                }
            }
        }
        throw new EntityNotInCacheException();
    }

    protected function storeEntityDataInCache(int $entityId, EntityData $entityData): void
    {
        if ((count($entityData->statements) + count($entityData->statementsAsObject)) === 0) {
            return;
        }
        $type = $entityData->getObjectForPredicate($this->typePredicate);

        $typeConfig = $this->typeConfig[$type] ?? $this->typeConfig[0];
        if ($typeConfig->useCache) {
            $typeConfig->entityDataCache->setData($entityId, $entityData, $this->cacheDataId, $typeConfig->ttl);
        }
        // cache the type
        $this->memCache->set($this->getMemCacheKey($entityId), $type, self::MemCacheTypeTtl);
    }
}