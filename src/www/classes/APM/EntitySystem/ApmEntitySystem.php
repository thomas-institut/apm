<?php

namespace APM\EntitySystem;

use APM\EntitySystem\Kernel\ApmEntitySystemKernel;
use APM\EntitySystem\Exception\EntityAlreadyMergedException;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Exception\InvalidEntityTypeException;
use APM\EntitySystem\Exception\InvalidObjectException;
use APM\EntitySystem\Exception\InvalidStatementException;
use APM\EntitySystem\Exception\InvalidSubjectException;
use APM\EntitySystem\Exception\PredicateCannotBeCancelledException;
use APM\EntitySystem\Exception\StatementAlreadyCancelledException;
use APM\EntitySystem\Exception\StatementNotFoundException;
use APM\EntitySystem\Kernel\PredicateDefinition;
use APM\EntitySystem\Kernel\PredicateFlag;
use APM\EntitySystem\Schema\Entity;
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
use ThomasInstitut\EntitySystem\Tid;
use ThomasInstitut\EntitySystem\TypedMultiStorageEntitySystem;


class ApmEntitySystem implements ApmEntitySystemInterface, LoggerAwareInterface
{
    use LoggerAwareTrait;

    /**
     * Data id for internal kernel caches, change every time there is a
     * change in the entity system schema or in the ApmEntitySystemKernel class
     */
    const dataId = '027';

    const kernelCacheKey = 'ApmEntitySystemKernel';

    const kernelCacheTtl = 8 * 24 * 3600;
    const minNameCacheTtl = 15 * 24 * 3600;
    const maxNameCacheTtl = 21 * 24 * 3600;

    const entityListCacheTtl =  30 * 24 * 3600;

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


    /**
     * @var callable
     */
    private $getMergesDataTableCallable;
    private ?DataTable $mergesDataTable;

    /**
     * Constructs the ApmEntitySystem
     *
     * $getTypedMultiStorageEntitySystem is a function that takes no arguments and returns a TypeMultiStorageEntitySystem
     * object.
     *
     * $mergesDataTable is the table where merge data will be stored. It should at least the following three columns:
     *   id: int
     *   entity: big int, not null  (a Tid)
     *   mergedInto: big int (a Tid)
     *
     * @param callable $getTypedMultiStorageEntitySystem
     * @param callable $getMergesDataTable
     * @param DataCache $memDataCache
     * @param string $memCachePrefix
     */
    public function __construct(callable  $getTypedMultiStorageEntitySystem, callable $getMergesDataTable,
                                DataCache $memDataCache, string $memCachePrefix)
    {
        $this->getInnerEntitySystemCallable = $getTypedMultiStorageEntitySystem;
        $this->getMergesDataTableCallable = $getMergesDataTable;
        $this->memCache = $memDataCache;
        $this->cachePrefix = $memCachePrefix;
        $this->innerEntitySystem = null;
        $this->kernel = null;
        $this->mergesDataTable = null;
        $this->logger = new NullLogger();
    }

    private function getMergesDataTable() : DataTable {
        if ($this->mergesDataTable === null) {
            $this->mergesDataTable = call_user_func($this->getMergesDataTableCallable);
        }
        return  $this->mergesDataTable;
    }

    private function getCacheKeyKernel() : string {
        return implode('_', [ $this->cachePrefix, self::dataId, self::kernelCacheKey]);
    }

    private function getCacheKeyMergedInto(int $entity) : string {
        return implode('_', [ $this->cachePrefix, self::dataId, 'mergedInto', $entity]);
    }

    private function getCacheKeyEntityName(int $entity) : string {
        return implode('_', [ $this->cachePrefix, self::dataId, 'name', $entity]);
    }

    private function getCacheKeyValidQualificationObjects() : string {
        return implode('_', [ $this->cachePrefix, self::dataId, 'validQualificationObjects']);
    }

    private function getCacheKeyEntityList(int $type, bool $withMerged) : string {
        return implode('_', [ $this->cachePrefix, self::dataId, 'entityList', $type, $withMerged ? 'withMerged' : 'withoutMerged']);
    }

    private function getKernel() : ApmEntitySystemKernel {
        if ($this->kernel === null) {
            $kernelKey = $this->getCacheKeyKernel();
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
        $cacheKey = $this->getCacheKeyMergedInto($entity);
        try {
            $mergedInto = $this->memCache->get($cacheKey);
        } catch (KeyNotInCacheException) {
//            $this->logger->debug("MergedInto info for $entity not in mem cache");
            $rows = $this->getMergesDataTable()->findRows([ self::ColEntity => $entity]);
            if ($rows->count() === 0) {
                $mergedInto = 'null';
            } else {
                $mergedInto = $rows->getFirst()[self::ColMergedInto];
            }
//            $this->logger->debug("Storing MergedInto = '$mergedInto' for $entity in mem cache");

            $this->memCache->set($cacheKey, $mergedInto);
        }
        // at this point $mergedInto is either the string 'null', a numerical string or an integer
        if ($mergedInto === 'null') {
            return null;
        }
        // deal with merges into entities that have themselves been merged
        $mergedInto = intval($mergedInto);
        $mergedIntoOfMergeInto = $this->getMergedIntoEntity($mergedInto);
        if ($mergedIntoOfMergeInto === null) {
           return $mergedInto;
        } else {
            $this->memCache->set($cacheKey, $mergedIntoOfMergeInto);
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
        if ($authorTid !== Entity::System) {
            try {
                $authorType = $innerEs->getEntityType($authorTid);
            } catch (\ThomasInstitut\EntitySystem\Exception\EntityDoesNotExistException) {
                throw new InvalidArgumentException("Author $authorTid not an entity in the system");
            }

            if ($authorType !== Entity::tPerson) {
                throw  new InvalidArgumentException("Given author $authorTid is not a Person entity");
            }
        }


        if ($ts < 0) {
            $ts = time();
        }

        $extraStatements[] = [ Entity::pEntityCreationTimestamp, strval($ts)];
        $extraStatements[] =  [ Entity::pEntityName, $name];

        if ($description !== '') {
            $extraStatements[] = [ Entity::pEntityDescription, $description];
        }

        $metadata[] = [ Entity::pStatementAuthor, $authorTid ];
        $metadata[] = [ Entity::pStatementTimestamp, $ts];
        $metadata[] = [ Entity::pStatementEditorialNote, "Creating entity of type $entityType: '$name'"];

        $newEntityId =  $this->getInnerEntitySystem()->createEntity($entityType, $extraStatements, $metadata);

        if ($this->typeUsesCacheForEntityList($entityType)) {
            $this->memCache->delete($this->getCacheKeyEntityList($entityType, true));
            $this->memCache->delete($this->getCacheKeyEntityList($entityType, false));
        }
        return $newEntityId;
    }


    /**
     * @inheritdoc
     * @throws EntityDoesNotExistException
     */
    public function getEntityData(int $entity): EntityData
    {
        if ($this->getKernel()->isSystemEntity($entity)) {
           return $this->getKernel()->getEntityData($entity);
        }

        try {
            $entityData =  $this->getInnerEntitySystem()->getEntityData($entity);
        } catch (\ThomasInstitut\EntitySystem\Exception\EntityDoesNotExistException) {
            throw new EntityDoesNotExistException("Entity $entity does not exits");
        }

        $entityData->mergedInto = $this->getMergedIntoEntity($entity);

        if ($entityData->isMerged()) {
            return $entityData;
        }
        // get type and name
        $entityData->type = $entityData->getObjectForPredicate(Entity::pEntityType);
        $entityData->name = $entityData->getObjectForPredicate(Entity::pEntityName);

        // TODO: consider using caching here (if/when we have tons of merges)
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
                                  string $editorialNote = '', array $extraMetadata = [], int $ts = -1, string $cancellationNote = '') : int
    {
        if ($ts=== -1) {
            $ts = time();
        }

        if ($author !== Entity::System) {
            try {
                $authorType = $this->getInnerEntitySystem()->getEntityType($author);
            } catch (\ThomasInstitut\EntitySystem\Exception\EntityDoesNotExistException) {
                throw new InvalidArgumentException("Author $author not defined in the system");
            }

            if ($authorType !== Entity::tPerson) {
                throw new InvalidArgumentException("Author $author not a Person entity");
            }

            $authorTid  = $this->getMergedIntoEntity($author);
            if ($authorTid !== null) {
                throw new InvalidArgumentException("Author $author has been merged into $authorTid");
            }
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
            [ Entity::pStatementAuthor, $author],
            [ Entity::pStatementTimestamp, strval($ts)]
        ];

        $editorialNote = trim($editorialNote);

        if ($editorialNote !== '') {
            $metadata[] = [ Entity::pStatementEditorialNote, $editorialNote];
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
                $cancellationNote = trim($cancellationNote);
                if ($cancellationNote === '') {
                    $cancellationNote = "Automatically cancelled when setting new value for single property $predicate";
                }
                $cancellationMetadata[] = [ Entity::pCancelledBy, $author];
                $cancellationMetadata[] = [ Entity::pCancellationTimestamp, strval($ts)];
                $cancellationMetadata[] = [ Entity::pCancellationEditorialNote, $cancellationNote];
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
        // invalidate the name cache if necessary
        if ($predicate === Entity::pEntityName) {
            $this->memCache->delete($this->getCacheKeyEntityName($subject));
        }

        // return the last statement id
        return $statementIds[count($statementIds)-1];
    }

    /**
     * @param int $statementId
     * @param int $author
     * @param int $ts
     * @param string $cancellationNote
     * @return int
     * @throws StatementNotFoundException
     * @throws StatementAlreadyCancelledException
     * @throws PredicateCannotBeCancelledException
     */
    public function cancelStatement(int $statementId, int $author, int $ts = -1, string $cancellationNote = ''): int
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

        if ($author !== Entity::System) {
            try {
                $authorType = $innerEs->getEntityType($author);
            } catch (\ThomasInstitut\EntitySystem\Exception\EntityDoesNotExistException) {
                throw new InvalidArgumentException("Author $author not defined in the system");
            }

            if ($authorType !== Entity::tPerson) {
                throw new InvalidArgumentException("Author $author not a Person entity");
            }
        }

        $metadata = [
            [ Entity::pCancelledBy, $author],
            [ Entity::pCancellationTimestamp, strval($ts)]
        ];

        $cancellationNote = trim($cancellationNote);

        if ($cancellationNote !== '') {
            $metadata[] = [ Entity::pCancellationEditorialNote, $cancellationNote];
        }
        $kernel = $this->getKernel();

        try {
            $kernel->validateMetadata($metadata, PredicateFlag::CancellationPredicate);
        } catch (InvalidStatementException $e) {
            // should never happen, but just in case
            throw new RuntimeException("Invalid statement exception: " . $e->getMessage());
        }

        if (!$kernel->predicateCanBeCancelled($statementData->predicate)) {
            throw new PredicateCannotBeCancelledException("Predicate $statementData->predicate cannot be cancelled");
        }

        try {
            return $this->getInnerEntitySystem()->cancelStatementWithMetadata($statementId, $metadata);
        } catch (\ThomasInstitut\EntitySystem\Exception\StatementAlreadyCancelledException) {
            throw new StatementAlreadyCancelledException();
        } catch (\ThomasInstitut\EntitySystem\Exception\StatementNotFoundException) {
            throw new StatementNotFoundException();
        }
    }

    private function typeUsesCacheForEntityList(int $type) : bool {
        return in_array($type, [Entity::tPerson, Entity::tGeographicalPlace, Entity::tGeographicalArea, Entity::tOrganization]);
    }

    /**
     * @inheritDoc
     */
    public function getAllEntitiesForType(int $type, bool $includeMerged = false) : array
    {
        if (!$this->getKernel()->isValidEntityType($type)) {
            throw new InvalidArgumentException("Entity $type is not a type");
        }

        $entities = [];
        if ($this->getKernel()->isSystemType($type)) {
            array_push($entities, ...($this->getKernel()->getAllEntitiesForType($type) ?? []));
        }

        $useCache = $this->typeUsesCacheForEntityList($type);
        $cacheKey = $this->getCacheKeyEntityList($type, $includeMerged);
        $inCache = true;
        if ($useCache) {
            $this->logger->debug("Using cache for type $type entity list");
            try {
                return unserialize($this->memCache->get($cacheKey));
            } catch (KeyNotInCacheException) {
                $this->logger->debug("Cache miss for type $type entity list");
                $inCache = false;
                $nonSystemEntities =  $this->getInnerEntitySystem()->getAllEntitiesForType($type);
            }
        } else {
            $nonSystemEntities =  $this->getInnerEntitySystem()->getAllEntitiesForType($type);
        }

        array_push($entities, ...$nonSystemEntities);

        // at this point $entities contains the list of all entities, including merged entities

        if ($useCache && !$inCache) {
            $this->memCache->set($this->getCacheKeyEntityList($type, true), serialize($entities), self::entityListCacheTtl);
        }

        if ($includeMerged) {
            return $entities;
        }

        $filteredEntities = [];
        foreach ($entities as $entity) {
            if ($this->getMergedIntoEntity($entity) === null) {
                $filteredEntities[] = $entity;
            }
        }
        if ($useCache) {
            $this->memCache->set($this->getCacheKeyEntityList($type, false), serialize($filteredEntities), self::entityListCacheTtl);
        }
        return $filteredEntities;
    }

    /**
     * @throws EntityDoesNotExistException
     * @throws EntityAlreadyMergedException
     */
    public function mergeEntity(int $entity, int $mergeInto, int $author, string $editorialNote, int $ts = -1) : void {

        if ($ts < 0) {
            $ts = time();
        }
        $entityType = $this->getEntityType($entity);

        if ($this->getMergedIntoEntity($entity) !== null) {
            throw new EntityAlreadyMergedException("Entity $entity already merged");
        }

        $mergeIntoType = $this->getEntityType($mergeInto);

        if ($entityType !== $mergeIntoType) {
            throw new InvalidArgumentException("Entities to be merged are not of the same type:  $entity -> $entityType; $mergeInto -> $mergeIntoType");
        }

        if ($this->getMergedIntoEntity($mergeInto) !== null) {
            throw new InvalidArgumentException("MergeInto entity $mergeInto is itself merged");
        }

        try {
            // using the inner entity system because only non-system entities can be merged with
            // this method. System entities are merged in the schema itself
            $entityData = $this->getInnerEntitySystem()->getEntityData($entity);
        } catch (\ThomasInstitut\EntitySystem\Exception\EntityDoesNotExistException $e) {
            // should never happen
            throw new RuntimeException("Entity does not exist exception: " . $e->getMessage());
        }

        if ($author !== Entity::System && $this->getEntityType($author) !== Entity::tPerson ) {
            throw new InvalidArgumentException("Author $author not a Person entity");
        }

        $commands = [];

        $cancellationMetadata = [
            [ Entity::pCancelledBy, $author],
            [ Entity::pCancellationTimestamp, strval($ts)],
            [ Entity::pCancellationEditorialNote, "Merging entity into $mergeInto"]
        ];

        foreach ($entityData->statements as $statement) {
            if ($this->getKernel()->predicateCanBeCancelled($statement->predicate)) {
                $commands[] = [ EntitySystem::CancelStatementCommand, $statement->id, $cancellationMetadata];
            }
        }

        $commands[] = [ EntitySystem::MakeStatementCommand, $entity, Entity::pMergedInto, $mergeInto];
        $commands[] = [ EntitySystem::MakeStatementCommand, $entity, Entity::pMergedBy, $author];
        $commands[] = [ EntitySystem::MakeStatementCommand, $entity, Entity::pMergeTimestamp, strval($ts)];
        $commands[] = [ EntitySystem::MakeStatementCommand, $entity, Entity::pMergeEditorialNote, $editorialNote];

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
        $this->memCache->delete($this->getCacheKeyMergedInto($entity));
        if ($this->typeUsesCacheForEntityList($entityType)) {
            $this->memCache->delete($this->getCacheKeyEntityList($entityType, false));
        }
    }

    private function registerMerge(int $entity, int $mergeInfo) : void {
        try {
            $this->getMergesDataTable()->createRow([self::ColEntity => $entity, self::ColMergedInto => $mergeInfo]);
        } catch (RowAlreadyExists) {
            // should never happen
        }
    }

    /**
     * @throws EntityDoesNotExistException
     */
    public function getEntityType(int $entity): int
    {
        if ($this->getKernel()->isSystemEntity($entity)) {
            $data = $this->getKernel()->getEntityData($entity);
            return $data->type;
        }


        try {
            return $this->getInnerEntitySystem()->getEntityType($entity);
        } catch (\ThomasInstitut\EntitySystem\Exception\EntityDoesNotExistException) {
            throw new EntityDoesNotExistException("Entity $entity does not exist");
        }
    }


    /**
     * @inheritDoc
     */
    public function getEntityIdFromString(string $tidString): int
    {
        if (strlen($tidString) < 8 && intval($tidString) !== 0) {
            return intval($tidString);
        }
        return Tid::fromString($tidString);
    }

    public function getPredicateDefinition(int $predicate) : PredicateDefinition {
        return $this->getKernel()->getPredicateDefinition($predicate);
    }

    /**
     * @inheritDoc
     */
    public function getValidPredicatesAsSubjectForType(int $type, bool $includeReverseRelations = false): array
    {
        return $this->getKernel()->getValidPredicatesAsSubjectForType($type, $includeReverseRelations);
    }

    /**
     * @inheritDoc
     */
    public function getValidPredicatesAsObjectForType(int $type, bool $includeReverseRelations = false): array
    {
        return $this->getKernel()->getValidPredicatesAsObjectForType($type, $includeReverseRelations);
    }

    public function entityCreationAllowedForType(int $tid) : bool {
        return $this->getKernel()->entityCreationAllowedForType($tid);
    }

    /**
     * @inheritDoc
     */
    public function getEntityName(int $entity): string
    {

        try {
            $data = $this->getKernel()->getEntityData($entity);
            return $data->name;
        } catch (EntityDoesNotExistException) {
            $useCache = $entity > ApmEntitySystemKernel::MaxSystemTid;
            $cacheKey = $this->getCacheKeyEntityName($entity);
            if ($useCache) {
                try {
                    return $this->memCache->get($cacheKey);
                } catch (KeyNotInCacheException) {
                }
            }
            $name = $this->getEntityData($entity)->getObjectForPredicate(Entity::pEntityName);
            if ($name === null) {
                return '';
            }
            if ($useCache) {
                $this->memCache->set($cacheKey, $name, rand(self::minNameCacheTtl, self::maxNameCacheTtl));
            }
            return $name;
        }
    }

    /**
     * @inheritDoc
     */
    public function getValidQualificationPredicates(): array
    {
        return $this->getKernel()->getValidQualificationPredicates();
    }

    public function getStatements(?int $subject, ?int $predicate, int|string|null $object, bool $includeCancelled = false): array
    {
        return $this->getInnerEntitySystem()->getStatementsData($subject, $predicate, $object, $includeCancelled);
    }

    /**
     * @inheritDoc
     */
    public function getValidQualificationObjects(bool $onlyIds = false) : array {

        // this is very fast operation since the kernel itself is cached
        $validObjects  = $this->getKernel()->getValidQualificationObjects();
        if ($onlyIds) {
            return $validObjects;
        }
        // entity data can be cached in memory "forever" since it will only change when
        // there's a change in schema (and thus a change in the cache data id)
        $cacheKey = $this->getCacheKeyValidQualificationObjects();
        try {
            $objectData =  unserialize($this->memCache->get($cacheKey));
        } catch (KeyNotInCacheException) {

            $objectData = array_map( function (int $id) : EntityData {
                try {
                    return $this->getEntityData($id);
                } catch (EntityDoesNotExistException) {
                    throw new RuntimeException("Entity $id does not exist exception while getting qualification object data");
                }
            }, $validObjects);
            $this->memCache->set($cacheKey, serialize($objectData));
        }
        return $objectData;
    }
}