<?php

namespace APM\System\EntitySystem;

use InvalidArgumentException;
use LogicException;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\NullLogger;
use RuntimeException;
use ThomasInstitut\DataCache\DataCache;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\DataTable\DataTable;
use ThomasInstitut\DataTable\RowAlreadyExists;
use ThomasInstitut\EntitySystem\EntityData;
use ThomasInstitut\EntitySystem\EntitySystem;
use ThomasInstitut\EntitySystem\StatementData;
use ThomasInstitut\EntitySystem\TypedMultiStorageEntitySystem;


class ApmEntitySystem implements ApmEntitySystemInterface, LoggerAwareInterface
{
    use LoggerAwareTrait;

    const dataId = '20240305145831';

    const kernelCacheKey = 'ApmEntitySystemKernel';

    const kernelCacheTtl = 8 * 24 * 3600;

    const ColEntity = 'entity';
    const ColMergedInto = 'mergedInto';

    private ?TypedMultiStorageEntitySystem $innerEntitySystem;
    private ?ApmEntitySystemKernel $kernel;
    private DataCache $memCache;
    private string $cachePrefix;
    /**
     * @var callable
     */
    private $getInnerEntitySystemCallable;
    private DataTable $mergesDataTable;

    /**
     * Constructs the ApmEntitySystem
     *
     * $getTypedMultiStorageEntitySystem is a function that takes no arguments and returns a TypeMultiStorageEntitySystem
     * object
     *
     * $mergesDataTable is the table where merge data will be stored. It should at least the following three columns:
     *   id: int
     *   entity: big int, not null  (a Tid)
     *   mergedInto: big int (a Tid)
     *
     * @param callable $getTypedMultiStorageEntitySystem
     * @param DataTable $mergesDataTable
     * @param DataCache $memDataCache
     * @param string $memCachePrefix
     */
    public function __construct(callable  $getTypedMultiStorageEntitySystem,
                                DataTable $mergesDataTable, DataCache $memDataCache, string $memCachePrefix)
    {
        $this->getInnerEntitySystemCallable = $getTypedMultiStorageEntitySystem;
        $this->innerEntitySystem = null;
        $this->kernel = null;
        $this->memCache = $memDataCache;
        $this->cachePrefix = $memCachePrefix;
        $this->logger = new NullLogger();
        $this->mergesDataTable = $mergesDataTable;
    }

    private function getKernelCacheKey() : string {
        return implode('_', [ $this->cachePrefix, self::dataId, self::kernelCacheKey]);
    }

    private function getMergedIntoCacheKey(int $entity) : string {
        return implode('_', [ $this->cachePrefix, self::dataId, 'mergedInto', $entity]);
    }

    private function getKernel() : ApmEntitySystemKernel {
        if ($this->kernel === null) {
            $kernelKey = $this->getKernelCacheKey();
            try {
                return unserialize($this->memCache->get($kernelKey));
            } catch (KeyNotInCacheException) {
                $this->kernel = new ApmEntitySystemKernel();
                $this->memCache->set($kernelKey, serialize($this->kernel), self::kernelCacheTtl);
            }
        }
        return $this->kernel;
    }

    private function getInnerEntitySystem() : TypedMultiStorageEntitySystem {
        if ($this->innerEntitySystem === null) {
            $this->innerEntitySystem = call_user_func($this->getInnerEntitySystemCallable);
        }
        return $this->innerEntitySystem;
    }

    /**
     * Returns the entity into which the given entity has been merged,
     *
     * If the entity has not been merged, returns null
     *
     * @param int $entity
     * @return int|null
     */
    private function getMergedIntoEntity(int $entity) : int|null {

        if ($this->getKernel()->isSystemEntity($entity)) {
            return null;
        }
        $cacheKey = $this->getMergedIntoCacheKey($entity);
        try {
            $mergedInto = $this->memCache->get($cacheKey);
        } catch (KeyNotInCacheException) {
            $rows = $this->mergesDataTable->findRows([ self::ColEntity => $entity]);
            if ($rows->count() === 0) {
                $mergedInto = 'null';
            } else {
                $mergedInto = $rows->getFirst()[self::ColMergedInto];
            }
            $this->memCache->set($cacheKey, $mergedInto);
        }
        // at this pint $mergedInto is either the string 'null', a numerical string or an integer
        if ($mergedInto === 'null') {
            return null;
        }
        // deal with merges into entities that have themselves been merged
        $mergedInto = intval($mergedInto);
        $mergedIntoOfMergeInto = $this->getMergedIntoEntity($mergedInto);
        if ($mergedIntoOfMergeInto === null) {
           return $mergedInto;
        } else {
           return $mergedIntoOfMergeInto;
        }
    }


    /**
     * @throws InvalidEntityTypeException
     */
    public function createEntity(int $entityType, string $name, string $description, int $authorTid,  int $ts = -1): int
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
        if ($authorTid !== self::SystemEntity) {
            try {
                $authorType = $innerEs->getEntityType($authorTid);
            } catch (\ThomasInstitut\EntitySystem\Exception\EntityDoesNotExistException) {
                throw new InvalidArgumentException("Author $authorTid not an entity in the system");
            }

            if ($authorType !== EntityType::Person) {
                throw  new InvalidArgumentException("Given author $authorTid is not a Person entity");
            }
        }


        if ($ts < 0) {
            $ts = time();
        }

        $extraStatements[] = [ SystemPredicate::EntityCreationTimestamp, strval($ts)];
        $extraStatements[] =  [ SystemPredicate::EntityName, $name];

        if ($description !== '') {
            $extraStatements[] = [ SystemPredicate::EntityDescription, $description];
        }

        $metadata[] = [ SystemPredicate::StatementAuthor, $authorTid ];
        $metadata[] = [ SystemPredicate::StatementTimestamp, $ts];
        $metadata[] = [ SystemPredicate::StatementEditorialNote, "Creating entity of type $entityType: '$name'"];

        return $this->getInnerEntitySystem()->createEntity($entityType, $extraStatements, $metadata);
    }


    /**
     * @inheritdoc
     * @throws EntityDoesNotExistException
     */
    public function getEntityData(int $entity): EntityData
    {
        if ($this->getKernel()->isSystemEntity($entity)) {
            $data = new EntityData();
            $data->id = $entity;
            return $data;
        }
        try {
            $entityData =  $this->getInnerEntitySystem()->getEntityData($entity);
        } catch (\ThomasInstitut\EntitySystem\Exception\EntityDoesNotExistException) {
            throw new EntityDoesNotExistException("Entity $entity does not exits");
        }
        // TODO: consider using caching here
        // use merged entities in all statements
        $newStatements = [];
        foreach ($entityData->statements as $statement) {
            $newStatements[] = $this->getStatementDataWithMergesApplied($statement);
        }
        $entityData->statements = $newStatements;

        $newStatementsAsObject = [];
        foreach ($entityData->statementsAsObject as $statement) {
            $newStatementsAsObject[] = $this->getStatementDataWithMergesApplied($statement);
        }
        $entityData->statementsAsObject = $newStatementsAsObject;
        return $entityData;
    }

    /**
     * Returns a new version of the given statement data in which all entity merges
     * applied.
     *
     * @param StatementData $statementData
     * @return StatementData
     */
    private function getStatementDataWithMergesApplied(StatementData $statementData) : StatementData {
        $newStatementData = new StatementData();
        $newStatementData->id = $statementData->id;

        $subjectMergeInto = $this->getMergedIntoEntity($statementData->subject);
        $newStatementData->subject = $subjectMergeInto === null ? $statementData->subject : $subjectMergeInto;
        // predicates are never merged
        $newStatementData->predicate = $statementData->predicate;
        if (is_int($statementData->object) ) {
            $objectMergeInto = $this->getMergedIntoEntity($statementData->object);
            $newStatementData->object = $objectMergeInto === null ? $statementData->object : $objectMergeInto;
        } else {
            $newStatementData->object = $statementData->object;
        }

        $newStatementData->statementMetadata = $this->getMetadataWithMergesApplied($statementData->statementMetadata);
        $newStatementData->cancellationId = $statementData->cancellationId;
        $newStatementData->cancellationMetadata = $this->getMetadataWithMergesApplied($statementData->cancellationMetadata);

        return $newStatementData;
    }

    private function getMetadataWithMergesApplied(array $metadata) : array {
        $newMetadata = [];
        foreach($metadata as $metadatum) {
            [ $predicate, $metadataObject] = $metadatum;
            $newMetadataObject = $metadataObject;
            if (is_int($metadataObject) ) {
                $mergedObject = $this->getMergedIntoEntity($metadataObject);
                if ($mergedObject !== null) {
                    $newMetadataObject = $mergedObject;
                }
            }
            $newMetadata[] = [ $predicate, $newMetadataObject];
        }
        return $newMetadata;
    }


    /**
     * @throws InvalidObjectException
     * @throws InvalidStatementException
     * @throws InvalidSubjectException
     */
    public function makeStatement(int $subject, int $predicate, int|string $object, int $author,
                                  string $editorialNote = '', array $extraMetadata = [], int $ts = -1) : int
    {
        if ($ts=== -1) {
            $ts = time();
        }

        try {
            $authorType = $this->getInnerEntitySystem()->getEntityType($author);
        } catch (\ThomasInstitut\EntitySystem\Exception\EntityDoesNotExistException) {
            throw new InvalidArgumentException("Author $author not defined in the system");
        }

        if ($authorType !== EntityType::Person) {
            throw new InvalidArgumentException("Author $author not a Person entity");
        }

        $authorTid  = $this->getMergedIntoEntity($author);
        if ($authorTid !== null) {
            throw new InvalidArgumentException("Author $author has been merged into $authorTid");
        }

        $subjectTid = $this->getMergedIntoEntity($subject);
        if ($subjectTid !== null) {
            throw new InvalidSubjectException("Subject $subject is merged into $subjectTid");
        }

        try {
            $subjectType = $this->getInnerEntitySystem()->getEntityType($subject);
        } catch (\ThomasInstitut\EntitySystem\Exception\EntityDoesNotExistException) {
            throw new InvalidSubjectException("Subject $subject not an entity in the system");
        }

        if (is_int($object)) {
            try {
                $objectType = $this->getInnerEntitySystem()->getEntityType($object);
            } catch (\ThomasInstitut\EntitySystem\Exception\EntityDoesNotExistException) {
                throw new InvalidObjectException("Object $object not an entity in the system");
            }
            $objectTid = $this->getMergedIntoEntity($object);
            if ($objectTid !== null) {
                throw new InvalidObjectException("Object $object has been merged into $objectTid");
            }
        } else {
            $objectType = null;
        }


        $metadata = [
            [ SystemPredicate::StatementAuthor, $author],
            [ SystemPredicate::StatementTimestamp, strval($ts)]
        ];

        $editorialNote = trim($editorialNote);

        if ($editorialNote !== '') {
            $metadata[] = [ SystemPredicate::StatementEditorialNote, $editorialNote];
        }

        foreach($extraMetadata as $metadatum) {
            $metadata[] = $metadatum;
        }


        $this->getKernel()->validateStatement($subject, $subjectType, $predicate, $object, $objectType, $metadata);

        $commands = [];

        if ($this->getKernel()->isPredicateSingleProperty($predicate)) {
            $statements = $this->getInnerEntitySystem()->getStatements($subject, $predicate, null);
            if (count($statements) > 1) {
                throw new LogicException("Found more than 1 statements for single property $predicate, entity $subject");
            }
            if (count($statements) !== 0) {
                $statementId = $statements[0][0];
                $cancellationMetadata[] = [ SystemPredicate::CancelledBy, $author];
                $cancellationMetadata[] = [ SystemPredicate::CancellationTimestamp, strval($ts)];
                $cancellationMetadata[] = [ SystemPredicate::CancellationEditorialNote, "Setting new value/object for single property $predicate"];
                $commands[] = [ EntitySystem::CancelStatementCommand, $statementId, $cancellationMetadata];
            }
        }

        $commands[] = [ EntitySystem::MakeStatementCommand, $subject, $predicate, $object, $metadata];

        try {
            $statementIds = $this->getInnerEntitySystem()->makeMultipleStatementAndCancellations($commands);
        } catch (\ThomasInstitut\EntitySystem\Exception\EntityDoesNotExistException $e) {
            // should never happen
            throw new RuntimeException("Entity does not exist exception: " . $e->getMessage());
        } catch (\ThomasInstitut\EntitySystem\Exception\StatementNotFoundException $e) {
            // should never happen
            throw new RuntimeException("Statement not found exception: " . $e->getMessage());
        }
        // return the last statement id
        return $statementIds[count($statementIds)-1];
    }

    /**
     * @param int $statementId
     * @param int $author
     * @param int $ts
     * @param string $editorialNote
     * @return int
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
        } catch (\ThomasInstitut\EntitySystem\Exception\EntityDoesNotExistException) {
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

        try {
            $kernel->validateMetadata($metadata, SystemPredicate::IsCancellationPredicate);
        } catch (InvalidStatementException $e) {
            // should never happen, but just in case
            throw new RuntimeException("Invalid statement exception: " . $e->getMessage());
        }

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
    public function getAllEntitiesForType(int $type): array
    {
        if (!$this->getKernel()->isValidEntityType($type)) {
            throw new InvalidArgumentException("Entity $type is not a type");
        }

        if (!$this->getKernel()->entitiesCanBeQueriedForType($type)) {
            return [];
        }

        return $this->getInnerEntitySystem()->getAllEntitiesForType($type);
    }

    /**
     * @throws EntityDoesNotExistException
     * @throws EntityAlreadyMergedException
     */
    public function mergeEntity(int $entity, int $mergeInto, int $author, string $editorialNote, int $ts = -1) : void {

        if ($ts < 0) {
            $ts = time();
        }
        try {
            $entityType = $this->getInnerEntitySystem()->getEntityType($entity);
        } catch (\ThomasInstitut\EntitySystem\Exception\EntityDoesNotExistException) {
            throw new EntityDoesNotExistException("Entity $entity does not exist");
        }

        if ($this->getMergedIntoEntity($entity) !== null) {
            throw new EntityAlreadyMergedException("Entity $entity already merged");
        }

        try {
            $mergeIntoType = $this->getInnerEntitySystem()->getEntityType($mergeInto);
        } catch (\ThomasInstitut\EntitySystem\Exception\EntityDoesNotExistException) {
            throw new EntityDoesNotExistException("Entity $mergeInto does not exist");
        }

        if ($entityType !== $mergeIntoType) {
            throw new InvalidArgumentException("Entities to be merged are not of the same type:  $entity -> $entityType; $mergeInto -> $mergeIntoType");
        }

        if ($this->getMergedIntoEntity($mergeInto) !== null) {
            throw new InvalidArgumentException("MergeInto entity $mergeInto is itself merged");
        }

        try {
            $entityData = $this->getInnerEntitySystem()->getEntityData($entity);
        } catch (\ThomasInstitut\EntitySystem\Exception\EntityDoesNotExistException $e) {
            // should never happen
            throw new RuntimeException("Entity does not exist exception: " . $e->getMessage());
        }

        try {
            $authorType = $this->getInnerEntitySystem()->getEntityType($author);
        } catch (\ThomasInstitut\EntitySystem\Exception\EntityDoesNotExistException) {
            throw new InvalidArgumentException("Author $author not defined in the system");
        }

        if ($authorType !== EntityType::Person) {
            throw new InvalidArgumentException("Author $author not a Person entity");
        }

        $commands = [];

        $cancellationMetadata = [
            [ SystemPredicate::CancelledBy, $author],
            [ SystemPredicate::CancellationTimestamp, $ts],
            [ SystemPredicate::CancellationEditorialNote, "Merging entity into $mergeInto"]
        ];

        foreach ($entityData->statements as $statement) {
            if ($this->getKernel()->predicateCanBeCancelled($statement->predicate)) {
                $commands[] = [ EntitySystem::CancelStatementCommand, $statement->id, $cancellationMetadata];
            }
        }

        $commands[] = [ EntitySystem::MakeStatementCommand, $entity, SystemPredicate::MergedInto, $mergeInto];
        $commands[] = [ EntitySystem::MakeStatementCommand, $entity, SystemPredicate::MergedBy, $author];
        $commands[] = [ EntitySystem::MakeStatementCommand, $entity, SystemPredicate::MergeTimestamp, $ts];
        $commands[] = [ EntitySystem::MakeStatementCommand, $entity, SystemPredicate::MergeEditorialNote, $editorialNote];

        try {
            $this->getInnerEntitySystem()->makeMultipleStatementAndCancellations($commands);
        } catch (\ThomasInstitut\EntitySystem\Exception\EntityDoesNotExistException $e) {
            //should never happen
            throw new RuntimeException("Entity does not exist exception: " . $e->getMessage());
        } catch (\ThomasInstitut\EntitySystem\Exception\StatementNotFoundException $e) {
            // should never happen
            throw new RuntimeException("Statement not found exception: " . $e->getMessage());
        }

        $this->registerMerge($entity, $mergeInto);
    }

    private function registerMerge(int $entity, int $mergeInfo) : void {
        try {
            $this->mergesDataTable->createRow([self::ColEntity => $entity, self::ColMergedInto => $mergeInfo]);
        } catch (RowAlreadyExists) {
            // should never happen
        }
    }

    public function getEntityType(int $entity): int
    {
        try {
            return $this->getInnerEntitySystem()->getEntityType($entity);
        } catch (\ThomasInstitut\EntitySystem\Exception\EntityDoesNotExistException) {
            throw new EntityDoesNotExistException("Entity $entity does not exist");
        }
    }


}