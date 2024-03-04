<?php

namespace ThomasInstitut\EntitySystem;

use ThomasInstitut\EntitySystem\Exception\StatementNotFoundException;

/**
 * A minimal entity system with DataTable storage.
 *
 */
class MultiStorageEntitySystem implements EntitySystemWithMetadata
{
    protected StatementStorage $defaultStorage;

    /**
     * Constructs an entity system instance that stores statements in a set of
     * StatementStorage objects.
     *
     * The
     *
     * @param StatementStorage $defaultStorage
     */
    public function __construct(StatementStorage $defaultStorage)
    {
        $this->defaultStorage = $defaultStorage;
    }

    /**
     * @inheritDoc
     */
    public function makeStatement(int $subject, int $predicate, int|string $object): int
    {
       return $this->makeStatementWithMetadata($subject, $predicate, $object, []);
    }

    /**
     * Returns the statement data table in which the given statement must be stored
     *
     * @param int $subject
     * @param int $predicate
     * @param int|string $object
     * @return StatementStorage
     */
    protected function getStorageForStatement(int $subject, int $predicate, int|string $object) : StatementStorage {
        return $this->defaultStorage;
    }


    /**
     * Returns all statement storages defined in the system.
     *
     * @return StatementStorage[]
     */
    protected function getAllStorages() : array {
        return [ $this->defaultStorage ];
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

    public function generateUniqueEntityId(): int
    {
        return Tid::generateUnique();
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
                    $storage = $this->getStorageForStatement($subject, $predicate, $object) ?? $this->defaultStorage;
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
                        $storage = $this->findStorageForStatementId($statementId);
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
        $storage = $this->getStorageForStatement($subject, $predicate, $object) ?? $this->defaultStorage;
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
     * @throws StatementNotFoundException
     */
    protected function findStorageForStatementId(int $statementId) : StatementStorage {
        foreach ($this->getAllStorages() as $storage) {
            try {
                $storage->retrieveStatement($statementId);
                return $storage;
            } catch (StatementNotFoundException $e) {
            }
        }
        throw  new StatementNotFoundException();
    }
}