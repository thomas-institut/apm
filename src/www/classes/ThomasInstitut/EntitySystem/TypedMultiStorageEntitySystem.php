<?php

namespace ThomasInstitut\EntitySystem;


use RuntimeException;
use ThomasInstitut\DataCache\DataCache;
use ThomasInstitut\DataCache\ItemNotInCacheException;
use ThomasInstitut\DataTable\NullLogger;
use ThomasInstitut\EntitySystem\EntityDataCache\EntityNotInCacheException;
use ThomasInstitut\EntitySystem\Exception\EntityDoesNotExistException;
use ThomasInstitut\EntitySystem\Exception\InvalidArgumentException;
use ThomasInstitut\EntitySystem\Exception\StatementAlreadyCancelledException;
use ThomasInstitut\EntitySystem\Exception\StatementNotFoundException;


/**
 * An entity system with multiple storages where data is partitioned
 * according to the object of a specific predicate that each entity
 * has.
 *
 * In the context of this class, this predicate is called
 * the entity's type, but in principle it can be any predicate.
 *
 * In the constructor, the different statement storages and entity caches are
 * assigned to individual types, with a default storage and cache for unassigned
 * types.
 *
 * An entity is considered to exist in the system if it is the subject of any
 * statement. Entities MUST have at least one statement, the one with the
 * type predicate.
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
    const int MemCacheTypeTtl = 365 * 24 * 3600; // 1 year

    /**
     * TTL for cached entity data
     */
    const int MemCacheDataTtl = 30 * 24 * 3600; // 30 days

    /**
     * Constructs an entity system using the given $typePredicate as the predicate
     * that assigns a type to an entity and the storage and cache configuration
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
     * The class requires also a fast in-memory cache for efficient entity type lookups. This cache can be
     * shared among classes or applications.
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
        $this->logger = new NullLogger();
    }


    /**
     * Checks and cleans up the configuration array.
     *
     * @param TypeStorageConfig[] $config
     * @return array
     * @throws InvalidArgumentException
     */
    protected function getCleanTypeConfig(array $config) : array {
        /** @var TypeStorageConfig[] $typeConfig */
        $typeConfig = [];
        foreach ($config as $configEntry) {
            $typeConfig[$configEntry->type] = $configEntry;
        }
        if (!isset($typeConfig[0])) {
            throw new InvalidArgumentException("No default configuration found");
        }
        $defaultConfig = $typeConfig[0];
        if ($defaultConfig->ttl === null) {
            $defaultConfig->ttl = 0;
        }

        $defaultTtl = $defaultConfig->ttl;

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


    private function getMemCacheKey(int $tid, string $postfix = '') : string {
        $parts = [];
        if ($this->memCachePrefix !== '') {
            $parts[] = $this->memCachePrefix;
        }
        $parts[] = $tid;
        if ($postfix !== '') {
            $parts[] = $postfix;
        }
        return implode(':', $parts);
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
            return intval($this->memCache->get($this->getMemCacheKey($tid, 'type')));
        } catch (ItemNotInCacheException) {
            $type = $this->getEntityData($tid)->getObjectForPredicate($this->typePredicate);
            $this->memCache->set($this->getMemCacheKey($tid, 'type'), $type);
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
     * The subject of these statements is the newly created entity.
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

        $typeConfig = $this->typeConfig[$entityType] ?? $this->typeConfig[0];
        $typeConfig->getStatementStorage()->storeMultipleStatementsAndCancellations($commands);

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
            if (!in_array($config->getStatementStorage(), $storages, true)) {
                $storages[] = $config->getStatementStorage();
            }
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
     * @param int $entity
     * @return EntityData
     * @throws EntityDoesNotExistException
     */
    public function getEntityData(int $entity): EntityData
   {
       $entityData = parent::getEntityData($entity);

       if(count($entityData->statements) === 0) {
           throw new EntityDoesNotExistException("Entity $entity does not exist");
       }
       return $entityData;
   }

    private function getStatementStorageForType(int $type) : StatementStorage {
        return isset($this->typeConfig[$type]) ? $this->typeConfig[$type]->getStatementStorage() : $this->typeConfig[0]->getStatementStorage();
    }

    /**
     * @throws EntityDoesNotExistException
     */
    protected function getStorageForStatement(int $subject, int $predicate, int|string $object): StatementStorage
    {

        $subjectType = $predicate ===  $this->typePredicate ? $object : $this->getEntityType($subject);
        $typeConfig = $this->typeConfig[$subjectType] ?? $this->typeConfig[0];
        return $typeConfig->getStatementStorage();
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

  public function getAllEntitiesForType(int $type) : array {
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

      $entitiesInvolved = [ $statementDataBeforeCancellation->subject];
      if (is_int($statementDataBeforeCancellation->object)) {
          $entitiesInvolved[] = $statementDataBeforeCancellation->object;
      }
      $this->invalidateCacheForMultipleEntities($entitiesInvolved);

      return  $cancellationId;
  }

    public function makeStatementWithMetadata(int $subject, int $predicate, int|string $object, array $metadata): int
    {
       $statementId = parent::makeStatementWithMetadata($subject, $predicate, $object, $metadata);

       $entitiesInvolved = [ $subject];
       if (is_int($object)) {
           $entitiesInvolved[] = $object;
       }

       $this->invalidateCacheForMultipleEntities($entitiesInvolved);

       return $statementId;
    }


    /**
     * @inheritDoc
     * @throws StatementNotFoundException
     * @throws EntityDoesNotExistException
     */
    public function makeMultipleStatementAndCancellations(array $statementsAndCancellations): array
    {
        $storagesInvolved = [];
        $commandsPerStorage = [];
        $returnArray = [];
        $entitiesInvolved = [];

        foreach ($statementsAndCancellations as $index => $command) {
            $commandName = $command[0];

            switch($commandName) {

                case EntitySystem::MakeStatementCommand:
                    [ , $subject, $predicate, $object ] = $command;
                    $metadata = $command[4] ?? [] ;

                    try {
                        $storage = $this->getStorageForStatement($subject, $predicate, $object);
                    } catch (EntityDoesNotExistException) {
                        throw new EntityDoesNotExistException("Entity $subject in statement index $index does not exist");
                    }
                    if (!in_array($storage, $storagesInvolved)) {
                        $storagesInvolved[] = $storage;
                    }
                    $storageIndex = array_search($storage, $storagesInvolved);
                    $statementId = $this->generateUniqueEntityId();
                    $commandsPerStorage[$storageIndex][] = [ StatementStorage::StoreStatementCommand,
                        $statementId, $subject, $predicate, $object, $metadata];
                    $returnArray[] = $statementId;
                    if (!in_array($subject, $entitiesInvolved)) {
                        $entitiesInvolved[] = $subject;
                    }

                    if (is_int($object) && !in_array($object, $entitiesInvolved)) {
                        $entitiesInvolved[] = $object;
                    }
                    break;

                case EntitySystem::CancelStatementCommand:
                    [ , $statementId, $metadata] = $command;
                    if (!isset($metadata)) {
                        $metadata = [];
                    }
                    $statementToCancel = null;
                    $storage = null;
                    foreach ($this->getAllStorages() as $storageToTry) {
                        try {
                            $statementToCancel = $storageToTry->retrieveStatement($statementId);
                            $storage = $storageToTry;
                        } catch (StatementNotFoundException) {
                        }
                    }

                    if ($statementToCancel === null) {
                        throw new StatementNotFoundException("Statement $statementId not found, in cancel statement command $index");
                    }

                    if ($storage === null) {
                        // should never happen
                        throw new RuntimeException("Null storage for cancel statement index $index");
                    }

                    if (!in_array($storage, $storagesInvolved)) {
                        $storagesInvolved[] = $storage;
                    }
                    $storageIndex = array_search($storage, $storagesInvolved);
                    $cancellationId = $this->generateUniqueEntityId();
                    $commandsPerStorage[$storageIndex][] = [ StatementStorage::CancelStatementCommand ,
                        $statementId, $cancellationId, $metadata];
                    $returnArray[] = $cancellationId;
                    [ , $subject, ,$object] = $statementToCancel;
                    if (!in_array($subject, $entitiesInvolved)) {
                        $entitiesInvolved[] = $subject;
                    }

                    if (is_int($object) && !in_array($object, $entitiesInvolved)) {
                        $entitiesInvolved[] = $object;
                    }
                    break;
            }
        }

        foreach($storagesInvolved as $storageIndex => $storage) {
            $storage->storeMultipleStatementsAndCancellations($commandsPerStorage[$storageIndex]);
        }

        $this->invalidateCacheForMultipleEntities($entitiesInvolved);

        return $returnArray;
    }


    /**
     * @param int[] $entities
     * @return void
     */
    protected function invalidateCacheForMultipleEntities(array $entities) : void {
        foreach ($entities as $entity) {
            try {
                $type = $this->getEntityType($entity);
            } catch (EntityDoesNotExistException) {
                continue;
            }
            $typeConfig = $this->typeConfig[$type] ?? $this->typeConfig[0];
            if ($typeConfig->useCache) {
                $typeConfig->getEntityDataCache()->invalidateData($entity);
            }
            if ($typeConfig->useMemCache) {
                $this->memCache->delete($this->getMemCacheKey($entity, 'data'));
            }
        }
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
                if ($typeConfig->useMemCache) {
                    try {
                        return unserialize($this->memCache->get($this->getMemCacheKey($entityId, 'data')));
                    } catch (ItemNotInCacheException) {
                    }
                }
//                $this->logger->debug("TypedMSESS: entity data for $entityId not in mem cache");
                try {
                    $data =  $typeConfig->getEntityDataCache()->getData($entityId, $this->cacheDataId);
                    if ($typeConfig->useMemCache) {
//                        $this->logger->debug("TypedMSESS: storing entity data for $entityId in mem cache");
                        $this->memCache->set($this->getMemCacheKey($entityId, 'data'), serialize($data), self::MemCacheDataTtl);
                    }
                    return $data;
                } catch (EntityNotInCacheException) {
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

        if ($type === null) {
            return;
        }

        $typeConfig = $this->typeConfig[$type] ?? $this->typeConfig[0];
        if ($typeConfig->useCache) {
            $typeConfig->getEntityDataCache()->setData($entityId, $entityData, $this->cacheDataId, $typeConfig->ttl);
        }
        if ($typeConfig->useMemCache) {
            $this->memCache->set($this->getMemCacheKey($entityId, 'data'), serialize($entityData), self::MemCacheDataTtl);
        }

        // cache the type
        $this->memCache->set($this->getMemCacheKey($entityId, 'type'), $type, self::MemCacheTypeTtl);

    }
}