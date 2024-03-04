<?php

namespace ThomasInstitut\EntitySystem;

use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;
use RuntimeException;
use ThomasInstitut\CodeDebug\CodeDebugInterface;
use ThomasInstitut\CodeDebug\CodeDebugWithLoggerTrait;
use ThomasInstitut\DataCache\DataCache;
use ThomasInstitut\DataCache\CacheAware;
use ThomasInstitut\DataCache\InMemoryDataCache;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\DataCache\SimpleCacheAware;
use ThomasInstitut\DataTable\DataTable;
use ThomasInstitut\DataTable\InvalidRowForUpdate;
use ThomasInstitut\DataTable\RowAlreadyExists;
use ThomasInstitut\EntitySystem\EntityDataCache\DataCacheEntityDataCache;
use ThomasInstitut\EntitySystem\EntityDataCache\EntityDataCache;
use ThomasInstitut\EntitySystem\Exception\DataConsistencyException;
use ThomasInstitut\EntitySystem\Exception\EntityDoesNotExistException;
use ThomasInstitut\EntitySystem\Exception\InvalidArgumentException;
use ThomasInstitut\EntitySystem\Exception\InvalidAttributeException;
use ThomasInstitut\EntitySystem\Exception\InvalidNameException;
use ThomasInstitut\EntitySystem\Exception\InvalidRelationException;
use ThomasInstitut\EntitySystem\Exception\InvalidTypeException;
use ThomasInstitut\TimeString\TimeString;


/**
 * An implementation of an entity system using (existing) DataTable and EntityDataCache objects as storage.
 *
 * In order to function the system needs at least one DataTable to store statements and an EntityDataCache, but both
 * data and cache can be partitioned based on entity type.
 *
 * For data security and performance reasons it is generally a good idea to have a dedicated DataTable for system
 * entities (types, attributes, relations, etc.) and one or more DataTable for the other entities. The larger the
 * number of entities of a given type, the most pressing the need to have its data its own table. Data migration
 * will be needed if storage is changed.
 *
 * A statements table must have at least the following columns:
 *
 *    id:  int, normally with AUTO INC if the datatable is an SQL table, not null
 *    tid: int64  (i.e., an integer of at least 64 bits), not null
 *    statementGroup: int64, not null
 *    subject: int64, not null
 *    predicate: int64, not null
 *    object: int64, default -1 or null
 *    value: text, default '' or null
 *    editedBy: int64, not null
 *    editTimestamp: int/timestamp, not null
 *    editorialNote: text, default '' or null
 *    qualifications: text (JSON)
 *    extraMetadata: text (JSON)
 *    cancelled: boolean, default false
 *    cancelledBy: int64, default -1 or null
 *    cancelTimestamp:  int/timestamp, default -1 or null
 *    cancelNote: text, default '' or null
 *
 * A particular statements table can be shared among entities of different types.
 *
 * At least one EntityDataCache object is required for general caching.
 *
 */
class DataTableApmEntitySystem implements ApmEntitySystem, CacheAware, CodeDebugInterface
{

    use CodeDebugWithLoggerTrait, SimpleCacheAware;

    const DEFAULT_CACHE_TTL = 14*24*3600;  // 2 weeks

    const CACHE_KEY_PREFIX_NAME_TO_TID = 'NameToTidMap-';
    const CACHE_KEY_PREFIX_ENTITY_DATA = 'EntityData-';


    private array $namedTypesTables;
    private int $systemTid;

    private string $cachingPrefix;
    private array $typeConfig;
    private ?array $attributeConfig;
    private ?array $relationConfig;
    private DataTable $defaultStatementsTable;
    private DataTable $systemStatementsTable;
    private EntityDataCache $defaultEntityDataCache;
    private EntityDataCache $systemEntityDataCache;
    protected ?LoggerInterface $logger = null;
    private EntityDataCache $internalInMemoryCache;

    /**
     * Constructs an entity system using the given (existing) data tables and cache.
     *
     * Each textual key in the $config associative array configures the storage
     * for entities of a given type:
     *   'someTypeName' =>  [
     *      'statementsTable' => someDataTable,
     *      'dataCache' => someDataCacheObject,
     *      'defaultCacheTtl' => someNumber // TTL for cached data in seconds, 0 means cache forever
     *   ]
     *
     * The special key 'default' is used to set the default storage for types not explicitly set up and MUST
     * be present in the configuration.
     *
     * The special key 'system' is used to set the default storage for system entities (EntityType, Attribute, Relation,
     * etc.) It is normally a good idea to have a separate statement table for these entities.
     *
     *
     * @param array $config
     * @param LoggerInterface|null $logger
     * @param bool $debug
     * @throws DataConsistencyException
     * @throws EntityDoesNotExistException
     * @throws InvalidArgumentException
     * @throws InvalidNameException
     * @throws InvalidTypeException
     */
    public function __construct(array $config, string $dataCachePrefix = '', LoggerInterface $logger = null, bool $debug = false)
    {
        /**
         * The goal is to construct the EntitySystem instance as fast as possible, caching data only when needed.
         * For this reason, the only data that is read and checked at construction time is $this->typesConfig.
         * If this data is not available, it is assumed that the entity system is empty and should be bootstrapped.
         */

        $this->internalInMemoryCache = new DataCacheEntityDataCache(new InMemoryDataCache());
        $this->cachingPrefix = $dataCachePrefix;
        if ($logger === null) {
            $this->setLogger(new NullLogger());
        } else {
            $this->setLogger($logger);
        }
        $this->systemTid = ApmEntitySystem::SystemEntity;
        $this->debugCode = $debug;

        $this->debugMsg("Constructing instance of " . get_class($this));


        $defaultConfig = null;
        $systemConfig = [];
        $typeConfigArray = [];

        foreach($config as $key => $typeConfig) {
            switch($key) {
                case 'default':
                    $defaultConfig = $typeConfig;
                    break;

                case 'system':
                    $systemConfig = $typeConfig;
                    break;

                default:
                    $typeConfigArray[$key] = $typeConfig;
                    break;
            }
        }

        if ($defaultConfig === null) {
            throw new InvalidArgumentException("No default config found in configuration array");
        }

        if (!isset($defaultConfig['statementsTable'])) {
            throw new InvalidArgumentException("No default statements table found in configuration array");
        }

        if (!isset($defaultConfig['dataCache'])) {
            throw new InvalidArgumentException("No default data cache found in configuration array");
        }

        if (!isset($defaultConfig['entityDataCache'])) {
            throw new InvalidArgumentException("No default entity data cache found in configuration array");
        }

        if(!is_a($defaultConfig['statementsTable'], DataTable::class)){
            throw new InvalidArgumentException("Default statements table not a DataTable object");
        }

        $this->defaultStatementsTable = $defaultConfig['statementsTable'];

        if(!is_a($defaultConfig['dataCache'], DataCache::class)){
            throw new InvalidArgumentException("Default data cache not an DataCache object");
        }
        $this->setCache($defaultConfig['dataCache']);
        $this->useCache();

        if(!is_a($defaultConfig['entityDataCache'], EntityDataCache::class)){
            throw new InvalidArgumentException("Default entity data cache not an EntityDataCache object");
        }

        $this->defaultEntityDataCache = $defaultConfig['entityDataCache'];


        // TODO: check that system table and cache are the right class objects
        $this->systemStatementsTable = $systemConfig['statementsTable'] ?? $this->defaultStatementsTable;
        $this->systemEntityDataCache = $systemConfig['entityDataCache'] ?? $this->defaultEntityDataCache;

        // Build skeleton typesConfig array with standard types and default configuration
        $this->typeConfig = [
            ApmEntitySystem::Name_Type_EntityType => [
                'typeTid' => ApmEntitySystem::Type_EntityType,
                'uniqueNames' => true,
                'statementsTable' => $this->systemStatementsTable,
                'entityDataCache' => $this->systemEntityDataCache,
                'defaultCacheTtl' => 0,
                'internalCache' => true,  // if true, entities of this type will be cached in the internal mem cache
            ],
            ApmEntitySystem::Name_Type_Attribute => [
                'typeTid' => ApmEntitySystem::Type_Attribute,
                'uniqueNames' => true,
                'statementsTable' => $this->systemStatementsTable,
                'entityDataCache' => $this->systemEntityDataCache,
                'defaultCacheTtl' => 0,
                'internalCache' => true
            ],
            ApmEntitySystem::Name_Type_Relation => [
                'typeTid' => ApmEntitySystem::Type_Relation,
                'uniqueNames' => true,
                'statementsTable' => $this->systemStatementsTable,
                'entityDataCache' => $this->systemEntityDataCache,
                'defaultCacheTtl' => 0,
                'internalCache' => true
            ],
            ApmEntitySystem::Name_Type_DataType => [
                'typeTid' => ApmEntitySystem::Type_DataType,
                'uniqueNames' => true,
                'statementsTable' => $this->systemStatementsTable,
                'entityDataCache' => $this->systemEntityDataCache,
                'defaultCacheTtl' => 0,
                'internalCache' => true
            ],
            ApmEntitySystem::Name_Type_Statement => [
                'typeTid' => ApmEntitySystem::Type_Statement,
                'uniqueNames' => false,
                'statementsTable' => $this->defaultStatementsTable,
                'entityDataCache' => $this->defaultEntityDataCache,
                'defaultCacheTtl' => self::DEFAULT_CACHE_TTL,
                'internalCache' => false
            ],
            ApmEntitySystem::Name_Type_Person => [
                'typeTid' => ApmEntitySystem::Type_Person,
                'uniqueNames' => false,
                'statementsTable' => $this->defaultStatementsTable,
                'entityDataCache' => $this->defaultEntityDataCache,
                'defaultCacheTtl' => self::DEFAULT_CACHE_TTL,
                'internalCache' => false
            ],
            ApmEntitySystem::Name_Type_Language => [
                'typeTid' => ApmEntitySystem::Type_Language,
                'uniqueNames' => false,
                'statementsTable' => $this->defaultStatementsTable,
                'entityDataCache' => $this->defaultEntityDataCache,
                'defaultCacheTtl' => self::DEFAULT_CACHE_TTL,
                'internalCache' => false
            ],
            ApmEntitySystem::Name_Type_Place => [
                'typeTid' => ApmEntitySystem::Type_Place,
                'uniqueNames' => false,
                'statementsTable' => $this->defaultStatementsTable,
                'entityDataCache' => $this->defaultEntityDataCache,
                'defaultCacheTtl' => self::DEFAULT_CACHE_TTL,
                'internalCache' => false
            ],
            ApmEntitySystem::Name_Type_Area => [
                'typeTid' => ApmEntitySystem::Type_Area,
                'uniqueNames' => false,
                'statementsTable' => $this->defaultStatementsTable,
                'entityDataCache' => $this->defaultEntityDataCache,
                'defaultCacheTtl' => self::DEFAULT_CACHE_TTL,
                'internalCache' => false
            ]
        ];

        // Fill in data table and cache configuration from constructor parameters
        foreach($typeConfigArray as $typeName => $typeConfig) {
            if (!isset($this->typeConfig[$typeName])) {
                $this->typeConfig[$typeName] = [
                    'typeTid' => -1,
                    'uniqueNames'=> false,
                    'statementsTable' => $this->defaultStatementsTable,
                    'entityDataCache' => $this->defaultEntityDataCache,
                    'defaultCacheTtl' => self::DEFAULT_CACHE_TTL,
                    'internalCache' => false
                ];
            }
            if (isset($typeConfig['statementsTable'])) {
                if(!is_a($typeConfig['statementsTable'], DataTable::class)){
                    throw new InvalidArgumentException("Statements table for type '$typeName' not a DataTable object");
                }
                $this->typeConfig[$typeName]['statementsTable'] = $typeConfig['statementsTable'];
            }
            if (isset($typeConfig['entityDataCache'])) {
                if(!is_a($typeConfig['entityDataCache'], EntityDataCache::class)){
                    throw new InvalidArgumentException("Data cache for type '$typeName' not an EntityDataCache object");
                }
                $this->typeConfig[$typeName]['entityDataCache'] = $typeConfig['entityDataCache'];
            }
            if (isset($typeConfig['defaultCacheTtl'])) {
                $this->typeConfig[$typeName]['defaultCacheTtl'] = intval($typeConfig['defaultCacheTtl']);
            }
        }

        $entityTypeNameToTidMap = $this->getEntityNameToTidMap(ApmEntitySystem::Name_Type_EntityType);
        $entityTypes = array_keys($entityTypeNameToTidMap);
        if (count($entityTypes) === 0) {
            $this->debugMsg("No entity types found, need to bootstrap the system");
            $this->bootStrap();
            // read again, now with valid data
            $entityTypeNameToTidMap = $this->getEntityNameToTidMap(StandardNames::TYPE_ENTITY_TYPE);
        }

        $this->debugMsg("Available types: " . implode(', ', $this->getValidEntityTypeNames()));
        foreach($entityTypeNameToTidMap as $typeName => $typeTid) {
            if (!isset($this->typeConfig[$typeName])) {
                $this->typeConfig[$typeName] = [
                    'uniqueNames'=> false,
                    'statementsTable' => $this->defaultStatementsTable,
                    'entityDataCache' => $this->systemEntityDataCache,
                    'defaultCacheTtl' => self::DEFAULT_CACHE_TTL,
                    'internalCache' => false
                ];
            }
            $this->typeConfig[$typeName]['typeTid'] = $typeTid;
        }

        // check that all types have a valid type tid
        foreach($this->typeConfig as $typeName => $typeConfig) {
            if (!isset($typeConfig['typeTid']) || $typeConfig['typeTid'] === -1) {
                $this->deleteEntityNameToTidMapFromCache(StandardNames::TYPE_ENTITY_TYPE);
                throw new DataConsistencyException("No EntityType tid found for type '$typeName'");
            }
        }

        $this->attributeConfig = null;
        $this->relationConfig = null;

        $this->debugMsg("Done constructing");
    }

    private function genCacheKey(string $key) : string {
        if ($this->cachingPrefix !== '') {
            return $this->cachingPrefix . '-' . $key;
        }
        return $key;
    }

    /**
     * @throws DataConsistencyException
     */
    private function getNameToTidMapFromStatements(DataTable $statementsTable, int $typeTid, string $typeName) : array {
        $rows = $statementsTable->findRows([
                'predicate' => ApmEntitySystem::Relation_IsOfType,
                'object' => $typeTid,
                'cancelled' => 0
            ]);

        $typeEntities = [];
        foreach ($rows as $row) {
            $typeEntities[] = $row['subject'];
        }

        $tids = [];

        foreach($typeEntities as $entity) {
            $rows = $statementsTable->findRows([
                'subject' => $entity,
                'predicate' => ApmEntitySystem::Attribute_Name,
                'cancelled' => 0
            ]);
            if (count($rows) === 0 || $rows->getFirst()['value'] === '') {
                throw new DataConsistencyException("No name for '$typeName' entity $entity");
            }
            if (count($rows) > 1 ) {
                throw new DataConsistencyException("Multiple names for '$typeName' entity $entity");
            }
            $tids[$rows->getFirst()['value']] = $entity;
        }
        return $tids;
    }

    protected function getUniqueTid(): int
    {
       return Tid::generateUnique();
    }


    /**
     * @throws InvalidTypeException
     * @throws DataConsistencyException
     */
    private function nameExistsInType(string|int $type, string $name) : bool{
        try {
            $this->getTidByTypeAndName($type, $name);
        } catch (EntityDoesNotExistException) {
            return false;
        }
        return true;
    }

    /**
     * @throws InvalidTypeException|DataConsistencyException
     */
    private function getEntityNameToTidMap(string $typeName) : array {

        $cacheKey = $this->genCacheKey(self::CACHE_KEY_PREFIX_NAME_TO_TID . $typeName);
        try {
            $map = unserialize($this->dataCache->get($cacheKey));
        } catch (KeyNotInCacheException) {
//            $this->debugMsg("EntityNameToTidMap for $typeName not in cache, building from statements");
            $table = $this->getStatementsTableForType($typeName);
            $typeTid = $this->getTypeTid($typeName);
            $map = $this->getNameToTidMapFromStatements($table, $typeTid, $typeName);
//            $this->codeDebug("map", $map);
            $this->dataCache->set($cacheKey, serialize($map));
        }
        return $map;
    }

    private function deleteEntityNameToTidMapFromCache(string $typeName) : void {
        $cacheKey = $this->genCacheKey(self::CACHE_KEY_PREFIX_NAME_TO_TID . $typeName);
        $this->dataCache->delete($cacheKey);
    }


    /**
     * @throws InvalidTypeException
     * @throws InvalidNameException
     * @throws DataConsistencyException
     */
    public function createEntity(string|int $type, string $name = '', string $description = '', int $createdBy = -1, int $timestamp = -1) : int {
        if ($type === '') {
            throw new InvalidTypeException("Empty type string given");
        }
        if ($createdBy === -1) {
            $createdBy = $this->systemTid;
        }
        if ($timestamp === -1) {
            $timestamp = time();
        }
        $typeTid = -1;
        $entityTypeName = '';
        foreach($this->typeConfig as $typeName => $typeConfig) {
            if ($typeConfig['typeTid'] === $type || $typeName === $type) {
                $typeTid = $typeConfig['typeTid'];
                $entityTypeName = $typeName;
                if ($typeConfig['uniqueNames']) {
                    if ($name === '') {
                        throw new InvalidNameException("Name cannot be empty for entities of type '$type'");
                    }
                    if ($this->nameExistsInType($type, $name)) {
                        throw new InvalidNameException("Name already exists, creating entity of type '$type', name '$name'");
                    }
                    // delete the name to tid map cache for this type
                    $this->deleteEntityNameToTidMapFromCache($type);
                }
            }
        }

        $table = $this->getStatementsTableForType($type);
        $newTid = $this->getUniqueTid();
        $this->setupEntityInStatementsTable($table,$newTid, $typeTid, $name, $description, '', $timestamp, $createdBy );
        $this->debugMsg("New entity created, type '$entityTypeName', name '$name', tid = $newTid");
        return $newTid;
    }

    /**
     * @throws InvalidTypeException
     */
    private function getStatementsTableForType(string|int $type) : DataTable {
        foreach($this->typeConfig as $typeName => $spec) {
            if ($typeName=== $type || $spec['typeTid'] === $type) {
                return $spec['statementsTable'] ?? $this->defaultStatementsTable;
            }
        }
        throw new InvalidTypeException();
    }

    protected function storeStatement(DataTable $statementsTable, int $statementGroup,
                                      int       $subject, int $predicate, int|string $valueOrObject,
                                      int       $editedBy, int $timestamp,
                                      array     $qualifications = [], array $statementMetadata = []) : int {

        $statementTid = $this->getUniqueTid();
        $qualificationsString= '';
        $statementMetadataString = '';

        if (count($qualifications) > 0) {
            $qualificationsString = json_encode($qualifications);
        }

        if (count($statementMetadata) > 0) {
            $statementMetadataString = json_encode($statementMetadata);
        }

        $row = [
            'id' => 0,
            'tid' => $statementTid,
            'statementGroup' => $statementGroup,
            'subject' => $subject,
            'predicate' => $predicate,
            'object' => null,
            'value' => null,
            'editedBy' => $editedBy,
            'editTimestamp' => $timestamp,
            'qualifications' => $qualificationsString,
            'statementMetadata' => $statementMetadataString,
            'cancelled' => 0,
            'cancelledBy' => -1,
            'cancellationTimestamp' => null,
            'cancellationNote' => '',

        ];

        if (is_int($valueOrObject)) {
            $row['object'] = $valueOrObject;
        } else {
            $row['value'] = $valueOrObject;
        }

        try {
            $statementsTable->createRow($row);
        } catch (RowAlreadyExists $e) {
            // should never happen
            throw new RuntimeException($e->getMessage());
        }
        return $statementTid;
    }

    private function getBooleanValueString(bool $value) : string {
        return $value ? ApmEntitySystem::Value_True : ApmEntitySystem::Value_False;
    }

    private function setupEntityInStatementsTable(DataTable $statementsTable, int $tid, int $typeTid,
                                                  string $name, string  $description, string $editorialNote, int $ts, int $editedBy) : int {

        $entitySetupStatementGroup = $this->getUniqueTid();
        $statementMetadata = [];
        if ($editorialNote !== '') {
            $statementMetadata[] = [ ApmEntitySystem::Attribute_StatementEditorialNote, $editorialNote];
        }

        $this->storeStatement($statementsTable, $entitySetupStatementGroup,
            $tid,
            ApmEntitySystem::Relation_IsOfType,
            $typeTid,
            $editedBy, $ts, [],  $statementMetadata
        );
        $this->storeStatement($statementsTable,$entitySetupStatementGroup,
            $tid,
            ApmEntitySystem::Attribute_Name,
            $name,
            $editedBy, $ts, [], $statementMetadata
        );
        $this->storeStatement($statementsTable,$entitySetupStatementGroup,
            $tid,
            ApmEntitySystem::Attribute_Description,
            $description,
            $editedBy, $ts, [], $statementMetadata
        );
        return $entitySetupStatementGroup;
    }

    private function setupTypeInStatementsTable(DataTable $statementsTable, int $typeTid, string $name, string $description, bool $hasUniqueNames, int $ts, int $editedBy) : void {
        $typeNameString = sprintf("%s:%s", StandardNames::TYPE_ENTITY_TYPE, $name);
        $editorialNote = "Setting up $typeNameString";
        $statementMetadata = [ [ApmEntitySystem::Attribute_StatementEditorialNote, $editorialNote]];

        $statementGroup =  $this->setupEntityInStatementsTable($statementsTable, $typeTid,
            self::Type_EntityType, $name, $description, $editorialNote, $ts, $editedBy);
        $this->storeStatement($statementsTable, $statementGroup,
            $typeTid,
            ApmEntitySystem::Attribute_MustHaveUniqueNames,
            $this->getBooleanValueString($hasUniqueNames),
            $editedBy, $ts, [], $statementMetadata
        );
    }

    /**
     * @throws DataConsistencyException
     * @throws EntityDoesNotExistException
     * @throws InvalidArgumentException
     * @throws InvalidNameException
     * @throws InvalidTypeException
     */
    protected function bootStrap() : void {

        $bootstrapTimestamp = time();
        $now = TimeString::now();
        $bootstrapEditorialNote = "Bootstrapping the entity system at $now server time";
        $this->logger->info($bootstrapEditorialNote);

        $typesToSetup = [
            [ ApmEntitySystem::Type_EntityType, ApmEntitySystem::Name_Type_EntityType, 'an entity type', true],
            [ ApmEntitySystem::Type_Attribute, ApmEntitySystem::Name_Type_Attribute, 'a predicate that has literal values as its object', true],
            [ ApmEntitySystem::Type_Relation, ApmEntitySystem::Name_Type_Relation, 'a predicate that has entities as its object', true],
            [ ApmEntitySystem::Type_DataType, ApmEntitySystem::Name_Type_DataType, 'e.g, integer, string, etc', true],
            [ ApmEntitySystem::Type_Statement, ApmEntitySystem::Name_Type_Statement, "a subject-predicate-object assertion done by a person in the system", false],
            [ ApmEntitySystem::Type_Person, ApmEntitySystem::Name_Type_Person, 'Normally a human being', false],
            [ ApmEntitySystem::Type_Place, ApmEntitySystem::Name_Type_Place, 'A geographical place with a definite location', false],
            [ ApmEntitySystem::Type_Area, ApmEntitySystem::Name_Type_Area, 'A geographical area, e.g. a country, a city', false],
        ];

        $entityTypeStatementsTable = $this->getStatementsTableForType(ApmEntitySystem::Type_EntityType);
        foreach($typesToSetup as $setupTuple) {
            [ $typeTid, $name, $description, $hasUniqueNames ] = $setupTuple;
            $this->setupTypeInStatementsTable($entityTypeStatementsTable,
                $typeTid,
                $name,
                $description,
                $hasUniqueNames,
                $bootstrapTimestamp,
                $this->systemTid
            );
        }

        $attributesToSetup = [
            [ ApmEntitySystem::Attribute_Name, ApmEntitySystem::Name_Attribute_Name, "The entity's name" ],
            [ ApmEntitySystem::Attribute_Description, ApmEntitySystem::Name_Attribute_Description, "A short description of the entity" ],
            [ ApmEntitySystem::Attribute_MustHaveUniqueNames, ApmEntitySystem::Name_Attribute_MustHaveUniqueNames, "Indicates if a type has entities with unique names" ],
            [ ApmEntitySystem::Attribute_OnlyOneAllowed, ApmEntitySystem::Name_Attribute_OnlyOneAllowed, "Indicates if only one value or object is allowed for a specific predicate" ],
            [ ApmEntitySystem::Attribute_CreationTimestamp, ApmEntitySystem::Name_Attribute_CreationTimestamp, "Timestamp when the entity was created" ],
            [ ApmEntitySystem::Attribute_StatementTimestamp, ApmEntitySystem::Name_Attribute_StatementTimestamp, "Timestamp when a statement was made"],
            [ ApmEntitySystem::Attribute_StatementEditorialNote, ApmEntitySystem::Name_Attribute_StatementEditorialNote, "Editorial note for a statement"],
            [ ApmEntitySystem::Attribute_Qualification_fromDate, ApmEntitySystem::Name_Attribute_Qualification_fromDate, "Date from which the value/object of a statement applies"],
            [ ApmEntitySystem::Attribute_Qualification_untilDate, ApmEntitySystem::Name_Attribute_Qualification_untilDate, "Date until which the value/object of a statement applies"],
            [ ApmEntitySystem::Attribute_Qualification_SequenceNumber, ApmEntitySystem::Name_Attribute_Qualification_SequenceNumber, "The sequence number of a statement within statements of the same predicate"],
            [ ApmEntitySystem::Attribute_MergeTimestamp, ApmEntitySystem::Name_Attribute_MergeTimestamp, "The timestamp when a merge operation was performed"],

        ];
        $attributeStatementsTable = $this->getStatementsTableForType(ApmEntitySystem::Type_Attribute);
        foreach($attributesToSetup as $setupTuple) {
            [ $entityTid, $name, $description] = $setupTuple;
            $this->setupEntityInStatementsTable($attributeStatementsTable,
                $entityTid,
                ApmEntitySystem::Type_Attribute,
                $name,
                $description,
                $bootstrapEditorialNote,
                $this->systemTid, $bootstrapTimestamp);
        }

        $relationsToSetup = [
            [ ApmEntitySystem::Relation_IsOfType, ApmEntitySystem::Name_Relation_IsOfType, "The type of an entity"],
            [ ApmEntitySystem::Relation_ObjectTypeMustBe, ApmEntitySystem::Name_Relation_ObjectTypeMustBe, "An entity type that is allowed for the object of a particular relation"],
            [ ApmEntitySystem::Relation_StatementEditor, ApmEntitySystem::Name_Relation_StatementEditor, "The editor of a statement"],
            [ ApmEntitySystem::Relation_Qualification_Language, ApmEntitySystem::Name_Relation_Qualification_Language, "The language of a value"],
            [ ApmEntitySystem::Relation_MergedInto, ApmEntitySystem::Name_Relation_MergedInto, "The entity into which the entity is merged"],
            [ ApmEntitySystem::Relation_MergedBy, ApmEntitySystem::Name_Relation_MergedBy, "The Person entity who performed a merge operation"],
        ];

        $relationStatementsTable = $this->getStatementsTableForType(ApmEntitySystem::Type_Relation);
        foreach($relationsToSetup as $setupTuple) {
            [ $entityTid, $name, $description] = $setupTuple;
            $this->setupEntityInStatementsTable($relationStatementsTable,
                $entityTid,
                ApmEntitySystem::Type_Relation,
                $name,
                $description,
                $bootstrapEditorialNote,
                $this->systemTid, $bootstrapTimestamp);
        }

        // Create standard data types
        $this->createEntity(StandardNames::TYPE_DATA_TYPE,
            StandardNames::DATATYPE_BOOLEAN,
            "a value that is either true or false",
            $this->systemTid, $bootstrapTimestamp);
        $this->createEntity(StandardNames::TYPE_DATA_TYPE,
            StandardNames::DATATYPE_INT,
            "an integer",
            $this->systemTid, $bootstrapTimestamp);
        $this->createEntity(StandardNames::TYPE_DATA_TYPE,
            StandardNames::DATATYPE_DATE,
            "a date, with some degree of vagueness",
            $this->systemTid, $bootstrapTimestamp);
        $this->createEntity(StandardNames::TYPE_DATA_TYPE,
            StandardNames::DATATYPE_JSON,
            "a JSON string",
            $this->systemTid, $bootstrapTimestamp);
        $this->createEntity(StandardNames::TYPE_DATA_TYPE,
            StandardNames::DATATYPE_NUMBER,
            "a number, e.g., a floating point number or an integer",
            $this->systemTid, $bootstrapTimestamp);
        $this->createEntity(StandardNames::TYPE_DATA_TYPE,
            StandardNames::DATATYPE_STRING,
            "a string",
            $this->systemTid, $bootstrapTimestamp);
        $this->createEntity(StandardNames::TYPE_DATA_TYPE,
            StandardNames::DATATYPE_TIMESTAMP,
            "an Unix timestamp",
            $this->systemTid, $bootstrapTimestamp);

        // Set up constraints in standard attributes

        $constraintsStatementGroup = $this->getUniqueTid();
        $bootstrapStatementMetadata = [ ApmEntitySystem::Attribute_StatementEditorialNote, $bootstrapEditorialNote ];
        $this->makeStatement(ApmEntitySystem::Attribute_Name,
            ApmEntitySystem::Attribute_OnlyOneAllowed, ApmEntitySystem::Value_True,
            $this->systemTid, $bootstrapStatementMetadata, [], $constraintsStatementGroup, $bootstrapTimestamp);

        $this->makeStatement(ApmEntitySystem::Attribute_Description,
            ApmEntitySystem::Attribute_OnlyOneAllowed, ApmEntitySystem::Value_True,
            $this->systemTid, $bootstrapStatementMetadata, [], -1, $bootstrapTimestamp);

        $this->makeStatement(ApmEntitySystem::Attribute_OnlyOneAllowed,
            ApmEntitySystem::Attribute_OnlyOneAllowed, ApmEntitySystem::Value_True,
            $this->systemTid, $bootstrapStatementMetadata, [], -1, $bootstrapTimestamp);

        // Set up constraints in standard relations
        $this->makeStatement(ApmEntitySystem::Relation_IsOfType,
            ApmEntitySystem::Attribute_OnlyOneAllowed, ApmEntitySystem::Value_True,
            $this->systemTid, $bootstrapStatementMetadata, [], -1, $bootstrapTimestamp);

        $this->makeStatement(ApmEntitySystem::Relation_IsOfType,
            ApmEntitySystem::Relation_ObjectTypeMustBe, ApmEntitySystem::Type_EntityType,
            $this->systemTid, $bootstrapStatementMetadata, [], -1, $bootstrapTimestamp);

        $this->logger->info("Finished bootstrapping the entity system");
    }

    /**
     * Returns the type name from a string or integer input parameter, additionally
     * checking that the type is defined.
     *
     * @param string|int $type
     * @return string
     * @throws InvalidTypeException
     * @throws EntityDoesNotExistException
     * @throws DataConsistencyException
     */
    protected function getTypeNameFromStringOrInt(string|int $type) : string {
        if (is_int($type)) {
            return $this->getEntityName($type, StandardNames::TYPE_ENTITY_TYPE);
        }
        $this->getTypeTid($type);
        return $type;
    }

    /**
     * Utility function to find a statement in the system
     * returns an array:
     *
     *   [
     *      'subjectTypeName' => someType,
     *      'dataTable' => someDataTable
     *      'statementRow' => row
     *   ]
     * @param int $statementTid
     * @param string|int $subjectType
     * @return array
     * @throws InvalidArgumentException
     * @throws DataConsistencyException
     */
    protected function findStatementDataByTid(int $statementTid, string|int $subjectType) : array {

        if ($subjectType !== '') {
            try {
                $subjectType = $this->getTypeNameFromStringOrInt($subjectType);
            } catch (InvalidTypeException|EntityDoesNotExistException) {
                throw new InvalidArgumentException("Given subject type $subjectType is not valid");
            }

        }

        if ($subjectType !== '') {
            $table = $this->typeConfig[$subjectType]['statementsTable'];
            $rows = $table->findRows(['tid' => $statementTid]);
            if (count($rows) === 1) {
                // found it!
                return [
                    'subjectDataType' => $subjectType,
                    'dataTable' => $table,
                    'statementRow' => $rows->getFirst()
                ];
            }
            if (count($rows) > 1) {
                $msg = "Found two rows for statement $statementTid in type $subjectType";
                $this->codeDebug($msg);
                throw new DataConsistencyException($msg);
            }

        } else {
            /** @var DataTable[] $tablesChecked */
            $tablesChecked = [];
            foreach ($this->typeConfig as $typeName => $typeConfig) {
                if (!in_array($typeConfig['statementsTable'], $tablesChecked)) {
                    /** @var DataTable $table */
                    $table =  $typeConfig['statementsTable'];
                    $tablesChecked[] = $table;
                    $rows =  $table->findRows(['tid' => $statementTid]);
                    if (count($rows) === 1) {
                        try {
                            $subjectType = $this->getEntityType($rows->getFirst()['subject']);
                        } catch (EntityDoesNotExistException) {
                            // should never happen!
                            $msg = "EntityDoesNotExist exception looking for subject type for statement";
                            $this->codeDebug( $msg, ['statementRow' => $rows->getFirst() ]);
                            throw new DataConsistencyException($msg);
                        }
                        // found it!
                        return [
                            'subjectDataType' => $subjectType,
                            'dataTable' => $table,
                            'statementRow' => $rows->getFirst()
                        ];
                    }
                    if (count($rows) > 1) {
                        $msg = "Found two rows for statement $statementTid in table for type $typeName";
                        $this->codeDebug($msg);
                        throw new DataConsistencyException($msg);
                    }

                }
            }
        }

        throw  new InvalidArgumentException("Statement $statementTid not found");
    }

    protected function doActualStatementCancellation(DataTable $table, DataCache $subjectDataCache,
                                                     array $statementRow,
                                                     int $cancelledBy, string $cancellationNote, $timestamp) : void {
        $statementRow['cancelled'] = 1;
        $statementRow['cancelledBy'] = $cancelledBy;
        $statementRow['cancellationNote'] = $cancellationNote;
        $statementRow['cancellationTimestamp'] = $timestamp;
        try {
            $table->updateRow($statementRow);
        } catch (InvalidRowForUpdate $e) {
            // should never happen
            $this->codeDebug("Invalid row for update: " . $e->getMessage());
            throw new RuntimeException($e->getMessage());
        }
        // delete entity caches for subject and/or object
        $this->deleteEntityDataInCache($statementRow['subject'], $subjectDataCache);
        if ($statementRow['object'] !== -1 && $statementRow['object'] !== null) {
            $this->deleteEntityDataInCache($statementRow['object']);
        }
    }


    /**
     *
     * @throws DataConsistencyException
     * @throws InvalidArgumentException
     */
    public function cancelStatement(int $statementTid, int $cancelledBy, string $cancellationNote,
                                    string|int $subjectType = '', int $ts = -1) : void
    {
        $statementData = $this->findStatementDataByTid($statementTid, $subjectType);
        // TODO: check if statement is cancellable

        /** @var DataTable $table */
        $table = $statementData['dataTable'];
        $subjectDataCache = $this->typeConfig[$statementData['subjectTypeName']]['dataCache'];
        $this->doActualStatementCancellation($table,
            $subjectDataCache, $statementData['statementRow'], $cancelledBy, $cancellationNote,$ts === -1 ? time() : $ts );
    }

    public function mergeEntities(int $entityTid, int $intoEntityTid, int $mergedByPersonTid, string $mergeNote, int $ts = -1) : int
    {
        // TODO: Implement mergeEntities() method.
        return -1;
    }




    /**
     * @throws DataConsistencyException
     * @throws EntityDoesNotExistException
     */
    public function getEntityType(int $entityTid) : int {
        // look into type config
        $tablesSearched = [];
        foreach ($this->typeConfig as $typeConfig) {
            if ($entityTid === $typeConfig['typeTid']) {
                // it's a type
                return ApmEntitySystem::Type_EntityType;
            }
            /** @var DataTable $table */
            $table = $typeConfig['statementsTable'];
            if (!in_array($table, $tablesSearched)) {
                $rows = $table->findRows([ 'subject' => $entityTid, 'predicate' => ApmEntitySystem::Relation_IsOfType, 'cancelled' => 0]);
                if (count($rows) === 1) {
                    return $rows->getFirst()['object'];
                }
                if (count($rows) > 1) {
                    $this->logger->error("Found more than one type-assignment statement for entity $entityTid", iterator_to_array($rows));
                }
                $tablesSearched[] = $table;
            }
        }
        // no luck with types, see if the entity is a statement or a statement group
        foreach($tablesSearched as $table) {
            $rows = $table->findRows([ 'tid' => $entityTid]);
            if (count($rows) > 0) {
                try {
                    $tid = $this->getTypeTid(StandardNames::TYPE_STATEMENT);
                } catch (InvalidTypeException) {
                    // would only happen if data is corrupted
                    $this->logger->error("Could not get type tid for type " . StandardNames::TYPE_STATEMENT .
                        " while looking for entity $entityTid's type");
                    throw new DataConsistencyException();
                }
                return $tid;
            }
            $rows = $table->findRows([ 'statementGroup' => $entityTid]);
            if (count($rows) > 0) {
                try {
                    $tid = $this->getTypeTid(StandardNames::TYPE_STATEMENT_GROUP);
                } catch (InvalidTypeException) {
                    // would only happen if data is corrupted
                    $this->logger->error("Could not get type tid for type " . StandardNames::TYPE_STATEMENT_GROUP .
                        " while looking for entity $entityTid's type");
                    throw new DataConsistencyException();
                }
                return $tid;
            }
        }
        throw new EntityDoesNotExistException();
    }

    /**
     * @throws InvalidTypeException
     * @throws EntityDoesNotExistException
     * @throws DataConsistencyException
     */
    public function getEntityName(int $entityTid, string|int $type = '') : string {
        // quick processing for entity types
        if ($type === StandardNames::TYPE_ENTITY_TYPE || $type === ApmEntitySystem::Type_EntityType) {
            // look into type config
            foreach ($this->typeConfig as $typeName => $typeConfig) {
                if ($entityTid === $typeConfig['typeTid']) {
                    return $typeName;
                }
            }
            throw new EntityDoesNotExistException();
        }
        if ($type === '') {
            $type = $this->getEntityType($entityTid);
        }

        if (is_int($type)) {
            $typeTid = $type;
            try {
                $typeName = $this->getEntityName($type, StandardNames::TYPE_ENTITY_TYPE);
            } catch (EntityDoesNotExistException) {
                throw new InvalidTypeException();
            }
        } else {
            $typeName = $type;
            $typeTid = $this->getTypeTid($typeName);
        }
        if (!isset($this->typeConfig[$typeName])) {
            $this->logger->error("No configuration for type '$typeName'");
            throw new DataConsistencyException();
        }

        // statements and statement groups do not have names
        if ($typeName === StandardNames::TYPE_STATEMENT || $typeName === StandardNames::TYPE_STATEMENT_GROUP) {
            return '';
        }

        if ($this->typeConfig[$typeName]['uniqueNames']) {
            // look into the name to tid map
            $map = $this->getEntityNameToTidMap($typeName);
            foreach($map as $name => $tid) {
                if ($tid === $entityTid) {
                    return $name;
                }
            }
        } else {
            // look into statements
            $table =$this->typeConfig[$typeName]['statementsTable'];
            $rows = $table->findRows([ 'subject' => $entityTid, 'predicate' => ApmEntitySystem::Attribute_Name, 'cancelled' => 0]);
            if (count($rows) === 1) {
                return $rows->getFirst()['value'];
            }
            if (count($rows) > 1) {
                // a data error
                $this->logger->error("Found more than one name for entity $entityTid of type $typeName");
                // but this should not break the system
                return $rows->getFirst()['value'];
            }
        }
        throw new EntityDoesNotExistException();
    }


    public function setEntityData(string|int $entityTid, array $predicates, int $editedBy, int $ts = -1) : int
    {
        // TODO: Implement setEntityData() method.
        return -1;
    }

    /**
     * Returns an entity's statements for the given predicate
     *
     * @throws InvalidArgumentException
     * @throws DataConsistencyException
     */
    public function getPredicateStatements(int $entityId, string $predicateType, string|int $predicate, string|int $entityType = '') : array {

        $entityStatements = $this->getEntityStatements($entityId, $entityType);

        $statements = [];
        foreach($entityStatements as $statement) {
            if ($statement['subject'] === $entityId && $statement['predicateType'] === $predicateType) {
                if (is_string($predicate) && $statement['predicateName'] === $predicate) {
                   $statements[] = $statement;
                }
                if (is_int($predicate) && $statement['predicate'] === $predicate) {
                    $statements[] = $statement;
                }
            }
        }
        return $statements;
    }



    /**
     * @throws EntityDoesNotExistException
     * @throws InvalidArgumentException
     * @throws DataConsistencyException
     */
    public function makeStatement(int   $subjectTid, string|int $predicate, string|int $valueOrObject,
                                  int   $editedByPersonTid,
                                  array $statementMetadata = [],
                                  array $qualifications = [],
                                  int   $statementGroup = -1, int $timestamp = -1) : array
    {
        if ($subjectTid === -1) {
            throw new InvalidArgumentException("Subject entity does not exist");
        }
        if (is_int($predicate)) {
            $predicateTid = $predicate;
        } else {
            try {
                $predicateTid = $this->getTidByTypeAndName($predicate);
            } catch( InvalidTypeException|EntityDoesNotExistException) {
                throw new InvalidArgumentException("Predicate $predicate is not defined in the system");
            }
        }

        try {
            $predicateType = $this->getEntityType($predicateTid);
        } catch(EntityDoesNotExistException) {
            throw new InvalidArgumentException("Predicate $predicate is not defined in the system");
        }

        $statementTid = $this->getUniqueTid();

        try {
            $entityTypeTid = $this->getEntityType($subjectTid);
        } catch(EntityDoesNotExistException) {
            throw new InvalidArgumentException("Subject entity does not exist");
        }

        if ($timestamp === -1) {
            $timestamp = time();
        }

        $cleanedUpMetadata = [];
        $cleanedUpMetadata[] = [ ApmEntitySystem::Attribute_StatementTimestamp, $timestamp];
        $cleanedUpMetadata[] = [ ApmEntitySystem::Relation_StatementEditor, $editedByPersonTid];

        // clean up statement metadata
        foreach($statementMetadata as $metadataTuple) {
            [$metadataPredicate,] = $metadataTuple;
            // TODO: check system config for allowed metadata predicates
            if ($metadataPredicate === ApmEntitySystem::Attribute_StatementEditorialNote) {
                $cleanedUpMetadata[] = $metadataTuple;
            }
        }

        if ($statementGroup === -1) {
            $statementGroup = $this->getUniqueTid();
        }
        $table = $this->getStatementsTableForType($entityTypeTid);


        // check restrictions on the predicate
        switch ($predicateType) {
            case  ApmEntitySystem::Type_Attribute:
                $value = strval($valueOrObject);
                $this->storeStatement($table, $statementGroup, $subjectTid, $predicateTid, $value,
                    $editedByPersonTid, $timestamp, $qualifications, $cleanedUpMetadata);
                break;

            case ApmEntitySystem::Type_Relation:
                $objectTid = $valueOrObject;
                if (is_string($valueOrObject)) {
                    $objectTid = $this->getTidByTypeAndName($valueOrObject);
                }
                try {
                    // check if the entity exists
                    $this->getEntityType($objectTid);
                } catch (EntityDoesNotExistException) {
                    throw new InvalidArgumentException("Object entity $valueOrObject does not exist");
                }
                // TODO: check type restrictions for relation
                $this->storeStatement($table, $statementGroup, $subjectTid, $predicateTid, $objectTid,
                    $editedByPersonTid, $timestamp, $qualifications, $cleanedUpMetadata);
                break;

            default:
                throw new InvalidArgumentException("Predicate $predicate is not an attribute or a relation");

        }

        return [$statementTid, $statementGroup];
    }

    /**
     * @throws KeyNotInCacheException
     */
    protected function getEntityDataFromCache(DataCache $cache, int $entityTid) : array {
        $cacheKey = self::CACHE_KEY_PREFIX_ENTITY_DATA . $entityTid;
        return unserialize($cache->get($cacheKey));
    }

    protected function storeEntityDataInCache(DataCache $cache, int $entityTid, array $data, int $ttl) : void {
        $cacheKey = self::CACHE_KEY_PREFIX_ENTITY_DATA . $entityTid;
        $cache->set($cacheKey, serialize($data), $ttl);
    }

    /**
     * Deletes entity data from cache.
     *
     * If no cache is given, tries to delete data from all caches in use by the system
     *
     * @param int $entityTid
     * @param DataCache|null $cache
     * @return void
     */
    protected function deleteEntityDataInCache(int $entityTid, DataCache $cache = null) : void {
        $cacheKey = self::CACHE_KEY_PREFIX_ENTITY_DATA . $entityTid;
        if ($cache !== null) {
            $cache->delete($cacheKey);
            return;
        }
        $this->internalInMemoryCache->delete($cacheKey);
        foreach($this->typeConfig as $typeConfig) {
            /** @var DataCache $cache */
            $cache = $typeConfig['dataCache'];
            $cache->delete($cacheKey);
        }
    }

    /**
     *
     * @throws DataConsistencyException
     * @throws InvalidArgumentException
     */
    public function getEntityStatements(int|string $entityId, int|string $entityType = ''): array
    {
        $entityTid = $entityId;
        if (is_string($entityId)) {
            try {
                $entityTid = $this->getTidByTypeAndName($entityId);
            } catch(InvalidTypeException) {
                throw new EntityDoesNotExistException("Invalid entity id $entityId");
            }
        }
        if ($entityType === '') {
            $entityTypeTid = $this->getEntityType($entityTid);
            try {
                $entityTypeName = $this->getEntityName($entityTypeTid, StandardNames::TYPE_ENTITY_TYPE);
            } catch(InvalidTypeException) {
                // this should never happen
                $this->logger->error("Invalid type exception trying to get type name for  $entityTypeTid");
                throw new DataConsistencyException();
            }
        } else {
            try {
                $entityTypeName = $this->getTypeNameFromStringOrInt($entityType);
            } catch (InvalidTypeException|EntityDoesNotExistException) {
                throw new InvalidArgumentException("Given entity type $entityType is not valid");
            }
        }


        /** @var DataCache $cache */
        $cache = $this->typeConfig[$entityTypeName]['dataCache'];
        try {
            $statements = $this->getEntityDataFromCache($cache, $entityTid);
        } catch (KeyNotInCacheException) {
            // need to rebuild
            $statements = $this->getEntityStatementsAsSubject($entityTid, $entityTypeName);
            $statementsAsObject = $this->getEntityStatementsAsObject($entityTid, $entityTypeName);
            foreach($statementsAsObject as $statement) {
                $statements[] = $statement;
            }
            $this->storeEntityDataInCache($cache, $entityTid, $statements,
                $this->typeConfig[$entityTypeName]['defaultCacheTtl']);
        }
        return $statements;
    }

    /**
     * @throws InvalidArgumentException
     * @throws EntityDoesNotExistException
     * @throws DataConsistencyException
     */
    protected function getAttributeValue(int|string $entityTid, int|string $attribute) : string {
        $attributeTid = $this->getTidByTypeAndName($attribute);
        if ($this->getEntityType($attributeTid) !== ApmEntitySystem::Type_Attribute) {
            throw new InvalidArgumentException("Given attribute $attribute not an attribute");
        }
        $statements = $this->getEntityStatements($entityTid, $attribute);
        foreach ($statements as $statement) {
            if ($statement['predicate'] === $attributeTid) {
                return $statement['value'];
            }
        }
        throw new InvalidAttributeException("Entity $entityTid does not have a value for attribute $attribute");
    }


    /**
     * @throws InvalidTypeException
     * @throws EntityDoesNotExistException
     * @throws DataConsistencyException
     */
    protected function getEntityStatementsAsSubject(int $entityTid, string $entityTypeName) : array {
        $table = $this->getStatementsTableForType($entityTypeName);
        $rows = $table->findRows(['subject' => $entityTid, 'cancelled' => 0]);
        $statements = [];
        foreach($rows as $row) {
            $statements[] = $this->getStatementDataFromRow($row);
        }
        return $statements;
    }

    /**
     * @throws InvalidTypeException
     * @throws EntityDoesNotExistException
     * @throws DataConsistencyException
     */
    protected function getEntityStatementsAsObject(int $entityTid, string $entityTypeName) : array {
        // for now, a brute force search in all statement tables
        $tablesSearched = [];
        $statements = [];
        foreach($this->typeConfig as $typeConfig) {
            /** @var DataTable $table */
            $table = $typeConfig['statementsTable'];
            if (!in_array($table, $tablesSearched)) {
                $rows = $table->findRows(['object' => $entityTid, 'cancelled' => 0]);
                foreach($rows as $row) {
                    $statements[] = $this->getStatementDataFromRow($row);
                }
                $tablesSearched[] = $table;
            }
        }

        return $statements;
    }

    /**
     * @throws InvalidTypeException
     * @throws EntityDoesNotExistException
     * @throws DataConsistencyException
     */
    protected function getStatementDataFromRow(array $row) : array {
        $predicate = $row['predicate'];
        $predicateType = $this->getEntityType($predicate);
        $predicateTypeName = $this->getEntityName($predicateType);

        $data = [
            'tid' => $row['tid'],
            'subject' => $row['subject'],
            'predicate' => $predicate,
            'predicateType' => $predicateTypeName,
            'predicateName' => $this->getEntityName($predicate, $predicateTypeName),
            //'qualifications' => [], // TODO: fill this up
            'editedBy' => $row['editedBy'],
            'editTimestamp' => $row['editTimestamp'],
            'editorialNote' => $row['editorialNote']
        ];

        if ($predicateTypeName === 'Relation') {
            $data['object'] = $row['object'];
        } else {
            $data['value'] = $row['value'];
        }

        return $data;
    }

    /**
     * @throws InvalidTypeException
     */
    private function getTypeTid(string $typeName) : int {
        foreach ($this->typeConfig as $name => $typeConfig) {
            if ($typeName === $name) {
                return $typeConfig['typeTid'];
            }
        }
        throw new InvalidTypeException();
    }

    /**
     * @throws DataConsistencyException
     * @throws InvalidTypeException
     * @throws EntityDoesNotExistException
     */
    public function getTidByTypeAndName(string|int $typeNameOrType, string $name = ''): int
    {
        // quick processing for entity types
        if ($name !== '' && ($typeNameOrType === StandardNames::TYPE_ENTITY_TYPE || $typeNameOrType === ApmEntitySystem::Type_EntityType)){
            try {
                $this->getTypeTid($name);
            } catch( InvalidTypeException) {
                throw new EntityDoesNotExistException();
            }
        }
        if ($typeNameOrType === -1) {
            throw new InvalidTypeException();
        }
        $entityTypeName = '';
        $entityName = '';

        if ($name === '') {
            // name should be embedded in the first parameter
            [ $entityTypeName, $entityName] = explode(':', $typeNameOrType);
            if ($entityTypeName === '') {
                throw new InvalidTypeException();
            }
            if ($entityName === '') {
                throw new EntityDoesNotExistException();
            }
            // check that the type exists (if not, getTypeTid will throw an exception)
            $this->getTypeTid($entityTypeName);
        } else {
            if (is_int($typeNameOrType)) {
                $typeTid = $typeNameOrType;
                try {
                    $entityTypeName = $this->getEntityName($typeTid, StandardNames::TYPE_ENTITY_TYPE);
                } catch (EntityDoesNotExistException) {
                    throw new InvalidTypeException("Type $typeTid does not exist");
                }
            } else {
                $entityTypeName = $typeNameOrType;
                // check that the type exists (if not, getTypeTid will throw an exception)
                $this->getTypeTid($entityTypeName);
            }
            $entityName = $name;
        }

//        $this->debugMsg("Getting tid for $entityTypeName:$entityName");

        foreach($this->typeConfig as $typeName => $typeConfig) {
            if ($entityTypeName === $typeName) {
                $uniqueNames = $typeConfig['uniqueNames'] ?? false;
                if (!$uniqueNames) {
                    // this function only works with types with uniquely named entities
                    throw new InvalidTypeException("Entity's type ($typeName) does not have unique names");
                }
                $map = $this->getEntityNameToTidMap($entityTypeName);
                if (!isset($map[$entityName])) {
                    throw new EntityDoesNotExistException();
                }
                return $map[$entityName];
            }
        }
        throw new EntityDoesNotExistException();
    }

    public function setLogger(LoggerInterface $logger): void
    {
       $this->logger = $logger;
    }

    /**
     * @throws InvalidTypeException
     */
    public function createEntityType(string $typeName, string $description, bool $uniqueNames, int $createdBy, int $timestamp): int
    {
        $currentTid = -1;
        try {
            $currentTid = $this->getTypeTid($typeName);
        } catch (InvalidTypeException) {
            // do nothing, the type does not exist, which is what we want
        }
        if ($currentTid !== -1) {
            throw new InvalidTypeException("Type '$typeName' already exists");
        }

        $tid = $this->getUniqueTid();

        $entityTypeStatementsTable = $this->getStatementsTableForType(StandardNames::TYPE_ENTITY_TYPE);

        $this->setupTypeInStatementsTable($entityTypeStatementsTable,
            $tid,
            $typeName,
            $description,
            $uniqueNames,
            $timestamp,
            $createdBy
        );
        if (isset($this->typeConfig[$typeName])){
            $this->typeConfig[$typeName]['typeTid'] = $tid;
            $this->typeConfig[$typeName]['uniqueNames'] = $uniqueNames;
        } else {
            $this->typeConfig[$typeName] = [
                'typeTid' => $tid,
                'uniqueNames' => $uniqueNames,
                'statementsTable' => $this->defaultStatementsTable,
                'dataCache' => $this->systemEntityDataCache,
                'defaultCacheTtl' => self::DEFAULT_CACHE_TTL,
                'internalCache' => false
            ];
        }
        $this->deleteEntityNameToTidMapFromCache(StandardNames::TYPE_ENTITY_TYPE);

        return $tid;
    }

    /**
     * @throws InvalidTypeException
     * @throws EntityDoesNotExistException
     * @throws DataConsistencyException
     */
    public function getDefinedEntityNamesForType(string|int $type) : array {
        $typeName = '';
        if (is_int($type)) {
            $typeName = $this->getEntityName($type, StandardNames::TYPE_ENTITY_TYPE);
        } else {
            $typeName = $type;
        }
        $map = $this->getEntityNameToTidMap($typeName);
        return array_keys($map);
    }

    /**
     * @throws InvalidTypeException
     * @throws EntityDoesNotExistException
     * @throws DataConsistencyException
     */
    public function getValidAttributeNames(): array
    {
        return $this->getDefinedEntityNamesForType(StandardNames::TYPE_ATTRIBUTE);
    }

    /**
     * @throws InvalidTypeException
     * @throws EntityDoesNotExistException
     * @throws DataConsistencyException
     */
    public function getValidRelationNames(): array
    {
        return $this->getDefinedEntityNamesForType(StandardNames::TYPE_RELATION);
    }

    /**
     * @throws InvalidTypeException
     * @throws EntityDoesNotExistException
     * @throws DataConsistencyException
     */
    public function getValidEntityTypeNames() : array {
        return $this->getDefinedEntityNamesForType(StandardNames::TYPE_ENTITY_TYPE);
    }

    /**
     * @throws InvalidTypeException
     * @throws DataConsistencyException
     */
    public function getEntitiesOfType(string|int $type): array {
        if ($type === '' || $type < 0) {
            throw new InvalidTypeException();
        }
        $typeName = '';
        $typeTid = -1;
        if (is_int($type)) {
            try {
                $typeName = $this->getEntityName($type, StandardNames::TYPE_ENTITY_TYPE);
            } catch (EntityDoesNotExistException|InvalidTypeException) {
                throw new InvalidTypeException();
            }
            $typeTid = $type;
        } else {
            $typeTid = $this->getTypeTid($type);
            $typeName = $type;
        }
        if ($this->typeConfig[$typeName]['uniqueNames']) {
            return array_values($this->getEntityNameToTidMap($typeName));
        }
        // look in statements
        $tids = [];
        /** @var DataTable $table */
        $table = $this->typeConfig[$typeName]['statementsTable'];
        $rows = $table->findRows( ['predicate' => ApmEntitySystem::Relation_IsOfType, 'object' => $typeTid, 'cancelled' => 0]);
        foreach($rows as $row) {
            $tids[] = $row['subject'];
        }
        return $tids;
    }

    private function getUpdatedPredicateConfig(string $type, string $attributeName) : array {
        // TODO: implement this
        return [];
    }

    /**
     * @throws InvalidTypeException
     * @throws EntityDoesNotExistException
     * @throws DataConsistencyException
     * @throws InvalidArgumentException
     */
    protected function getPredicateConfig(string $type) : array {
        if ($type !== StandardNames::TYPE_ATTRIBUTE && $type !== StandardNames::TYPE_RELATION) {
            throw new InvalidArgumentException("Expect attribute or relation, got $type");
        }
        $predicateConfig = $type === StandardNames::TYPE_ATTRIBUTE ? $this->attributeConfig : $this->relationConfig;
        if ($predicateConfig !== null) {
            // refresh stale entries
            foreach($predicateConfig as $attr => $config) {
                if (!$config['upToDate']) {
                    $predicateConfig[$attr] = $this->getUpdatedPredicateConfig($type, $attr);
                }
            }
            return $this->attributeConfig;
        }
        // need to rebuild
        $predicateConfig = [];
        $predicateNames = $this->getDefinedEntityNamesForType($type);
        foreach ($predicateNames as $attr) {
            $predicateConfig[$attr] = $this->getUpdatedPredicateConfig($type, $attr);
        }
        return $predicateConfig;
    }

}