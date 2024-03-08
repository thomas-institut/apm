<?php

namespace APM\System\EntitySystem;

use InvalidArgumentException;
use PDO;
use ThomasInstitut\DataCache\DataCache;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\DataCache\MemcachedDataCache;
use ThomasInstitut\EntitySystem\EntityData;


class ApmEntitySystem implements ApmEntitySystemInterface
{

    const dataId = '20240305145831';

    const kernelCacheKey = 'ApmEntitySystemKernel';

    const kernelCacheTtl = 8 * 24 * 3600;

    const defaultEntityDataTtl = 8 * 24 *3600;

    private ?ApmMultiStorageEntitySystem $innerEntitySystem;
    private PDO $pdo;
    private array $tableNames;
    private ?ApmEntitySystemKernel $kernel;
    private DataCache $dataCache;
    private string $cachePrefix;

    public function __construct(PDO $pdo, array $tableNames, DataCache $dataCache, string $cachePrefix)
    {
        $this->pdo = $pdo;
        $this->tableNames = $tableNames;
        $this->innerEntitySystem = null;
        $this->kernel = null;
        $this->dataCache = $dataCache;
        $this->cachePrefix = $cachePrefix;
    }

    private function getKernelCacheKey() : string {

        return $this->cachePrefix . self::kernelCacheKey . '_' . self::dataId;
    }

    private function getKernel() : ApmEntitySystemKernel {
        if ($this->kernel === null) {
            $kernelKey = $this->getKernelCacheKey();
            try {
                return unserialize($this->dataCache->get($kernelKey));
            } catch (KeyNotInCacheException) {
                $this->kernel = new ApmEntitySystemKernel();
                $this->dataCache->set($kernelKey, serialize($this->kernel), self::kernelCacheTtl);
            }
        }
        return $this->kernel;
    }

    private function getInnerEntitySystem() : ApmMultiStorageEntitySystem {
        if ($this->innerEntitySystem === null) {
            $this->innerEntitySystem = new ApmMultiStorageEntitySystem($this->pdo, $this->tableNames, new MemcachedDataCache());
        }
        return $this->innerEntitySystem;
    }


    /**
     * @throws InvalidEntityTypeException
     */
    public function createEntity(int $entityType, string $name, int $authorTid, string $description = '', int $ts = -1): int
    {
        $name = trim($name);
        if ($name === '') {
            throw new InvalidArgumentException("New entity name must not be empty");
        }

        $kernel = $this->getKernel();

        if (!$kernel->isValidEntityType($entityType)) {
            throw new InvalidEntityTypeException("Type $entityType is not defined");
        }

        if (!$kernel->entityCreationAllowedForType($entityType)) {
            throw new InvalidEntityTypeException("Creation of entities of type $entityType are not allowed");
        }

        $innerEs = $this->getInnerEntitySystem();
        try {
            $authorType = $innerEs->getEntityType($authorTid);
        } catch (EntityDoesNotExistException) {
            throw new InvalidArgumentException("Author $authorTid not an entity in the system");
        }

        if ($authorType !== EntityType::Person) {
            throw  new InvalidArgumentException("Given author $authorTid is not a Person entity");
        }


        return $this->getInnerEntitySystem()->createEntity($entityType, $name, $authorTid, $description,$ts);
    }


    /**
     * @throws EntityDoesNotExistException
     */
    public function getEntityData(int $entity): EntityData
    {
        if ($this->getKernel()->isSystemEntity($entity)) {
            $data = new EntityData();
            $data->id = $entity;
            return $data;
        }
        return $this->getInnerEntitySystem()->getEntityData($entity);
    }


    /**
     * @throws InvalidObjectException
     * @throws InvalidStatementException
     * @throws InvalidSubjectException
     */
    public function makeStatement(int    $subject, int $predicate, int|string $object, int $author,
                                  string $editorialNote = '', array $extraMetadata = [], int $ts = -1) : int
    {
        if ($ts=== -1) {
            $ts = time();
        }

        try {
            $authorType = $this->getInnerEntitySystem()->getEntityType($author);
        } catch (EntityDoesNotExistException) {
            throw new InvalidArgumentException("Author $author not defined in the system");
        }

        if ($authorType !== EntityType::Person) {
            throw new InvalidArgumentException("Author $author not a Person entity");
        }

        try {
            $subjectType = $this->getInnerEntitySystem()->getEntityType($subject);
        } catch (EntityDoesNotExistException) {
            throw new InvalidSubjectException("Subject $subject not an entity in the system");
        }

        if (is_int($object)) {
            try {
                $objectType = $this->getInnerEntitySystem()->getEntityType($object);
            } catch (EntityDoesNotExistException) {
                throw new InvalidObjectException();
            }
        } else {
            $objectType = null;
        }


        $metadata = [
            [ SystemPredicate::StatementAuthor, $author],
            [ SystemPredicate::StatementTimestamp, $ts]
        ];

        $editorialNote = trim($editorialNote);

        if ($editorialNote !== '') {
            $metadata[] = [ SystemPredicate::StatementEditorialNote, $editorialNote];
        }

        foreach($extraMetadata as $metadatum) {
            $metadata[] = $metadatum;
        }


        $this->getKernel()->validateStatement($subject, $subjectType, $predicate, $object, $objectType, $metadata);

        try {
            return $this->getInnerEntitySystem()->makeStatementWithMetadata($subject, $predicate, $object, $metadata);
        } catch (\ThomasInstitut\EntitySystem\Exception\InvalidStatementException $e) {
            throw new InvalidStatementException($e->getMessage());
        }

    }

    /**
     * @param int $statementId
     * @param int $author
     * @param int $ts
     * @param string $editorialNote
     * @return int
     * @throws InvalidStatementException
     * @throws StatementNotFoundException
     * @throws StatementAlreadyCancelledException
     * @throws PredicateCannotBeCancelledException
     */
    public function cancelStatement(int $statementId, int $author, int $ts = -1, string $editorialNote = ''): int
    {
        if ($ts=== -1) {
            $ts = time();
        }

        $innerEs = $this->getInnerEntitySystem();

        try {
            $statementData = $innerEs->getStatementById($statementId);
        } catch (\ThomasInstitut\EntitySystem\Exception\StatementNotFoundException) {
            throw new StatementNotFoundException();
        }

        try {
            $authorType = $innerEs->getEntityType($author);
        } catch (EntityDoesNotExistException) {
            throw new InvalidArgumentException("Author $author not defined in the system");
        }

        if ($authorType !== EntityType::Person) {
            throw new InvalidArgumentException("Author $author not a Person entity");
        }

        $metadata = [
            [ SystemPredicate::CancelledBy, $author],
            [ SystemPredicate::CancellationTimestamp, $ts]
        ];

        $editorialNote = trim($editorialNote);

        if ($editorialNote !== '') {
            $metadata[] = [ SystemPredicate::CancellationEditorialNote, $editorialNote];
        }
        $kernel = $this->getKernel();

        $kernel->validateMetadata($metadata, SystemPredicate::IsCancellationPredicate);

        if (!$kernel->predicateCanBeCancelled($statementData->predicate)) {
            throw new PredicateCannotBeCancelledException();
        }

        try {
            return $this->getInnerEntitySystem()->cancelStatementWithMetadata($statementId, $metadata);
        } catch (\ThomasInstitut\EntitySystem\Exception\StatementAlreadyCancelledException) {
            throw new StatementAlreadyCancelledException();
        } catch (\ThomasInstitut\EntitySystem\Exception\StatementNotFoundException) {
            throw new StatementNotFoundException();
        }
    }

    /**
     * @inheritDoc
     */
    public function getEntityTidsByType(int $type): array
    {
        if ($this->getKernel()->isValidEntityType($type)) {
            throw new InvalidArgumentException("Entity $type is not a type");
        }

        if (!$this->getKernel()->entitiesCanBeQueriedForType($type)) {
            return [];
        }

        return $this->getInnerEntitySystem()->getAllTidsForType($type);
    }
}