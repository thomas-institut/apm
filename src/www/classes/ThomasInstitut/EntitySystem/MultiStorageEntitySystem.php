<?php

namespace ThomasInstitut\EntitySystem;

use ThomasInstitut\EntitySystem\EntityDataCache\EntityNotInCacheException;
use ThomasInstitut\EntitySystem\Exception\StatementNotFoundException;

/**
 * An EntitySystemWithMetadata with multiple statement storages and entity data caches
 */
abstract class MultiStorageEntitySystem implements EntitySystemWithMetadata
{


    /**
     * @inheritDoc
     */
    abstract public function generateUniqueEntityId() : int;

    /**
     * Returns the statement storage where the given statement must be stored
     *
     * @param int $subject
     * @param int $predicate
     * @param int|string $object
     * @return StatementStorage
     */
    abstract protected function getStorageForStatement(int $subject, int $predicate, int|string $object) : StatementStorage;


    /**
     * Returns all statement storages defined in the system.
     *
     * @return StatementStorage[]
     */
    abstract protected function getAllStorages(): array;


    /**
     * @throws StatementNotFoundException
     */
    abstract protected function getStorageForStatementId(int $statementId) : StatementStorage;

    /**
     * @param int $entityId
     * @return EntityData
     * @throws EntityNotInCacheException
     */
    abstract protected function getEntityDataFromCache(int $entityId) : EntityData;


    abstract protected function storeEntityDataInCache(int $entityId, EntityData $entityData) : void;


    /**
     * @inheritDoc
     */
    public function makeStatement(int $subject, int $predicate, int|string $object): int
    {
       return $this->makeStatementWithMetadata($subject, $predicate, $object, []);
    }

    /**
     * @inheritDoc
     */
    public function getStatements(int|null $subject, int|null $predicate, string|int|null $object, bool $includeCancelled = false) : array
    {
        $statements = [];
        foreach ($this->getAllStorages() as $storage) {
            $storageStatements = $storage->findStatements($subject, $predicate, $object, true, $includeCancelled);
            foreach($storageStatements as $statement) {
                $statements[] = $statement;
            }
        }
        return $statements;
    }


    /**
     * @inheritDoc
     */
    public function cancelStatement(int $statementId): int
    {
       return $this->cancelStatementWithMetadata($statementId, []);
    }

    /**
     * @inheritDoc
     * @throws StatementNotFoundException
     */
    public function makeMultipleStatementAndCancellations(array $statementsAndCancellations): array
    {
        $storagesInvolved = [];
        $commandsPerStorage = [];
        $returnArray = [];

        foreach ($statementsAndCancellations as $index => $command) {
            $commandName = $command[0];

            switch($commandName) {

                case EntitySystem::MakeStatementCommand:
                    [ , $subject, $predicate, $object, $metadata] = $command;
                    if (!isset($metadata)) {
                        $metadata = [];
                    }
                    $storage = $this->getStorageForStatement($subject, $predicate, $object);
                    if (!in_array($storage, $storagesInvolved)) {
                        $storagesInvolved[] = $storage;
                    }
                    $storageIndex = array_search($storage, $storagesInvolved);
                    $statementId = $this->generateUniqueEntityId();
                    $commandsPerStorage[$storageIndex][] = [ StatementStorage::StoreStatementCommand,
                        $statementId, $subject, $predicate, $object, $metadata];
                    $returnArray[] = $statementId;
                    break;

                case EntitySystem::CancelStatementCommand:
                    [ , $statementId, $metadata] = $command;
                    if (!isset($metadata)) {
                        $metadata = [];
                    }
                    try {
                        $storage = $this->getStorageForStatementId($statementId);
                    } catch (StatementNotFoundException) {
                        throw new StatementNotFoundException("Statement $statementId not found, in cancel statement command $index");
                    }
                    if (!in_array($storage, $storagesInvolved)) {
                        $storagesInvolved[] = $storage;
                    }
                    $storageIndex = array_search($storage, $storagesInvolved);
                    $cancellationId = $this->generateUniqueEntityId();
                    $commandsPerStorage[$storageIndex][] = [ StatementStorage::CancelStatementCommand ,
                        $statementId, $cancellationId, $metadata];
                    $returnArray[] = $cancellationId;
                    break;
            }
        }

        foreach($storagesInvolved as $storageIndex => $storage) {
            $storage->storeMultipleStatementsAndCancellations($commandsPerStorage[$storageIndex]);
        }

        return $returnArray;
    }

    /**
     * @inheritDoc
     */
    public function makeStatementWithMetadata(int $subject, int $predicate, int|string $object, array $metadata): int
    {
        $storage = $this->getStorageForStatement($subject, $predicate, $object);
        $statementId = $this->generateUniqueEntityId();
        $storage->storeStatement($statementId, $subject,$predicate, $object, $metadata);
        return $statementId;
    }

    /**
     * @inheritDoc
     */
    public function cancelStatementWithMetadata(int $statementId, $metadata): int
    {
        $cancellationId = $this->generateUniqueEntityId();
        foreach($this->getAllStorages() as $storage) {
            try {
                $storage->cancelStatement($statementId, $cancellationId, $metadata);
                return $cancellationId;
            } catch (StatementNotFoundException) {
            }
        }
        throw new StatementNotFoundException();
    }



    /**
     * @inheritDoc
     */
    public function getStatementsData(?int $subject, ?int $predicate, int|string|null $object, bool $includeCancelled = false): array
    {
        $statements = $this->getStatements($subject, $predicate, $object, $includeCancelled);

        $statementsData = [];
        foreach($statements as $statement) {
            $statementsData[] = $this->getStatementDataFromStatementArray($statement);
        }

        return $statementsData;
    }

    protected function getStatementDataFromStatementArray($statement) : StatementData {
        [ $stId, $stSubject, $stPredicate, $stObject, $stCancellationId, $stMetadata, $stCancellationMetadata] = $statement;
        $data = new StatementData();
        $data->id = $stId;
        $data->subject = $stSubject;
        $data->predicate = $stPredicate;
        $data->object = $stObject;
        $data->cancellationId  = $stCancellationId ?? -1;
        $data->statementMetadata = $stMetadata ?? [];
        $data->cancellationMetadata = $stCancellationMetadata ?? [];
        return $data;
    }

    public function getEntityData(int $entity): EntityData
    {
        try {
            return $this->getEntityDataFromCache($entity);
        } catch (EntityNotInCacheException) {
            $data = new EntityData();
            $data->id = $entity;
            $data->statements = $this->getStatementsData($entity, null, null);
            $data->statementsAsObject = $this->getStatementsData(null, null, $entity);
            $this->storeEntityDataInCache($entity, $data);
            return $data;
        }
    }
}