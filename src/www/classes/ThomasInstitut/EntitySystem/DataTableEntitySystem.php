<?php

namespace ThomasInstitut\EntitySystem;

use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;
use ThomasInstitut\CodeDebug\CodeDebugInterface;
use ThomasInstitut\CodeDebug\CodeDebugWithLoggerTrait;
use ThomasInstitut\DataCache\DataCache;
use ThomasInstitut\DataCache\CacheAware;
use ThomasInstitut\DataCache\InMemoryDataCache;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\DataCache\SimpleCacheAware;
use ThomasInstitut\DataTable\DataTable;



/**
 * An implementation of an entity system using (existing) DataTable and DataCache object instances as storage.
 *
 * In order to function the system needs at least one DataTable to store statements and a DataCache, but both data
 * can cache can be partitioned based on entity type.
 *
 * For data security and performance reasons it is generally a good idea to have a dedicated DataTable for system
 * entities (types, attributes, relations, etc.) and one or more DataTable for the other entities. The larger the
 * number of entities of a given type, the most pressing the need to have its data its own table. Data migration
 * will be needed if storage is changed.
 *
 *
 * A statements table must have the following columns:
 *
 *    id:  int, normally with AUTO INC if the datatable is an SQL table, not null
 *    tid: int64  (i.e., an integer of at least 64 bits), not null
 *    subject: int64, not null
 *    predicate: int64, not null
 *    object: int64, default -1 or null
 *    value: text, default '' or null
 *    editedBy: int64, not null
 *    editTimestamp: int/timestamp, not null
 *    editorialNote: text, default '' or null
 *    fromDate: text  (not Date in SQL, because it will store vague dates), default '' or null
 *    untilDate: text (not Date), default '' or null
 *    seq: int, default -1 or null
 *    cancelled: int (actually boolean, with 0 meaning false, 1 meaning true), not null, default 0
 *    cancelledBy: int64, default -1 or null
 *    cancelTimestamp:  int/timestamp, default 0 or null
 *    cancelNote: text, default '' or null
 *    statementGroup: int64, default -1 or null
 *
 * A particular statements table can be shared among entities of different types.
 *
 * A DataCache object is required for general caching. A caching prefix will be used to distinguish cache
 * entries for a particular entity system, so the DataCache can be shared among different applications.
 *
 */
class DataTableEntitySystem implements EntitySystem, CacheAware, LoggerAwareInterface, CodeDebugInterface
{

    use SimpleCacheAware, CodeDebugWithLoggerTrait;

    const DEFAULT_CACHE_TTL = 14*24*3600;  // 2 weeks

    const CACHE_KEY_PREFIX_NAME_TO_TID = 'NameToTidMap-';
    const CACHE_KEY_PREFIX_ENTITY_DATA = 'EntityData-';

    private DataTable $defaultStatementsTable;
    private array $namedTypesTables;
    private int $systemTid;

    private string $cachingPrefix;
    private array $typesConfig;
    private DataTable $systemStatementsTable;
    private DataCache $systemDataCache;
    protected ?LoggerInterface $logger = null;
    private InMemoryDataCache $internalInMemoryCache;


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
     * @param string $cachingPrefix
     * @param LoggerInterface|null $logger
     * @param bool $debug
     * @throws DataConsistencyException
     * @throws InvalidArgumentException
     * @throws InvalidAttributeException
     * @throws InvalidNameException
     * @throws InvalidRelationException
     * @throws InvalidTypeException
     */
    public function __construct(array $config, string $cachingPrefix = '', LoggerInterface $logger = null, bool $debug = false)
    {
        /**
         * The goal is to construct the instance as fast as possible, caching data only when needed.
         * For this reason, the only data that is read and checked at construction time is $this->typesConfig.
         * If this data is not available, it is assumed that the entity system is empty and should be bootstrapped.
         */

        $this->internalInMemoryCache = new InMemoryDataCache();
        $this->cachingPrefix = $cachingPrefix;
        if ($logger === null) {
            $this->setLogger(new NullLogger());
        } else {
            $this->setLogger($logger);
        }
        $this->systemTid = EntitySystem::ENTITY_SYSTEM;
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

        if(!is_a($defaultConfig['statementsTable'], DataTable::class)){
            throw new InvalidArgumentException("Default statements table not a DataTable object");
        }

        $this->defaultStatementsTable = $defaultConfig['statementsTable'];

        if(!is_a($defaultConfig['dataCache'], DataCache::class)){
            throw new InvalidArgumentException("Default data cache not a DataCache object");
        }

        $this->setCache($defaultConfig['dataCache']);
        $this->useCache();

        // TODO: check that system table and cache are the right class objects
        $this->systemStatementsTable = $systemConfig['statementsTable'] ?? $this->defaultStatementsTable;
        $this->systemDataCache = $systemConfig['dataCache'] ?? $this->dataCache;

        // Build skeleton typesConfig array with standard types and default configuration
        $this->typesConfig = [
            StandardNames::TYPE_ENTITY_TYPE => [
                'typeTid' => EntitySystem::ENTITY_TYPE__ENTITY_TYPE,
                'uniqueNames' => true,
                'statementsTable' => $this->systemStatementsTable,
                'dataCache' => $this->systemDataCache,
                'defaultCacheTtl' => 0,
                'internalCache' => true,  // if true, entities of this type will be cached in the internal mem cache
            ],
            StandardNames::TYPE_ATTRIBUTE => [
                'typeTid' => EntitySystem::ENTITY_TYPE__ATTRIBUTE,
                'uniqueNames' => true,
                'statementsTable' => $this->systemStatementsTable,
                'dataCache' => $this->systemDataCache,
                'defaultCacheTtl' => 0,
                'internalCache' => true
            ],
            StandardNames::TYPE_RELATION => [
                'typeTid' => EntitySystem::ENTITY_TYPE__RELATION,
                'uniqueNames' => true,
                'statementsTable' => $this->systemStatementsTable,
                'dataCache' => $this->systemDataCache,
                'defaultCacheTtl' => 0,
                'internalCache' => true
            ],
            StandardNames::TYPE_DATA_TYPE => [
                'typeTid' => -1,
                'uniqueNames' => true,
                'statementsTable' => $this->systemStatementsTable,
                'dataCache' => $this->systemDataCache,
                'defaultCacheTtl' => 0,
                'internalCache' => true
            ],
            StandardNames::TYPE_STATEMENT => [
                'typeTid' => -1,
                'uniqueNames' => false,
                'statementsTable' => $this->defaultStatementsTable,
                'dataCache' => $this->systemDataCache,
                'defaultCacheTtl' => self::DEFAULT_CACHE_TTL,
                'internalCache' => false
            ],

            StandardNames::TYPE_STATEMENT_GROUP=> [
                'typeTid' => -1,
                'uniqueNames' => false,
                'statementsTable' => $this->defaultStatementsTable,
                'dataCache' => $this->systemDataCache,
                'defaultCacheTtl' => self::DEFAULT_CACHE_TTL,
                'internalCache' => false
            ],
            StandardNames::TYPE_PERSON=> [
                'typeTid' => -1,
                'uniqueNames' => false,
                'statementsTable' => $this->defaultStatementsTable,
                'dataCache' => $this->systemDataCache,
                'defaultCacheTtl' => self::DEFAULT_CACHE_TTL,
                'internalCache' => false
            ],
            StandardNames::TYPE_PLACE=> [
                'typeTid' => -1,
                'uniqueNames' => false,
                'statementsTable' => $this->defaultStatementsTable,
                'dataCache' => $this->systemDataCache,
                'defaultCacheTtl' => self::DEFAULT_CACHE_TTL,
                'internalCache' => false
            ],
            StandardNames::TYPE_AREA=> [
                'typeTid' => -1,
                'uniqueNames' => false,
                'statementsTable' => $this->defaultStatementsTable,
                'dataCache' => $this->systemDataCache,
                'defaultCacheTtl' => self::DEFAULT_CACHE_TTL,
                'internalCache' => false
            ],
        ];

        // Fill in data table and cache configuration from constructor parameters
        foreach($typeConfigArray as $typeName => $typeConfig) {
            if (!isset($this->typesConfig[$typeName])) {
                $this->typesConfig[$typeName] = [
                    'typeTid' => -1,
                    'uniqueNames'=> false,
                    'statementsTable' => $this->defaultStatementsTable,
                    'dataCache' => $this->systemDataCache,
                    'defaultCacheTtl' => self::DEFAULT_CACHE_TTL,
                    'internalCache' => false
                ];
            }
            if (isset($typeConfig['statementsTable'])) {
                if(!is_a($typeConfig['statementsTable'], DataTable::class)){
                    throw new InvalidArgumentException("Statements table for type '$typeName' not a DataTable object");
                }
                $this->typesConfig[$typeName]['statementsTable'] = $typeConfig['statementsTable'];
            }
            if (isset($typeConfig['dataCache'])) {
                if(!is_a($typeConfig['dataCache'], DataCache::class)){
                    throw new InvalidArgumentException("Data cache for type '$typeName' not a DataCache object");
                }
                $this->typesConfig[$typeName]['dataCache'] = $typeConfig['dataCache'];
            }
            if (isset($typeConfig['defaultCacheTtl'])) {
                $this->typesConfig[$typeName]['defaultCacheTtl'] = intval($typeConfig['defaultCacheTtl']);
            }
        }

        $entityTypeNameToTidMap = $this->getEntityNameToTidMap(StandardNames::TYPE_ENTITY_TYPE);
        $entityTypes = array_keys($entityTypeNameToTidMap);
        if (count($entityTypes) === 0) {
            $this->debugMsg("No entity types found, need to bootstrap the system");
            $this->bootStrap();
            // read again, now with valid data
            $entityTypeNameToTidMap = $this->getEntityNameToTidMap(StandardNames::TYPE_ENTITY_TYPE);
        }

        $this->debugMsg("Available types: " . implode(', ', $this->getValidEntityTypeNames()));
        foreach($entityTypeNameToTidMap as $typeName => $typeTid) {
            if (!isset($this->typesConfig[$typeName])) {
                $this->typesConfig[$typeName] = [
                    'uniqueNames'=> false,
                    'statementsTable' => $this->defaultStatementsTable,
                    'dataCache' => $this->systemDataCache,
                    'defaultCacheTtl' => self::DEFAULT_CACHE_TTL,
                    'cacheAll' => false
                ];
            }
            $this->typesConfig[$typeName]['typeTid'] = $typeTid;
        }

        // check that all types have a valid type tid
        foreach($this->typesConfig as $typeName => $typeConfig) {
            if (!isset($typeConfig['typeTid']) || $typeConfig['typeTid'] === -1) {
                $this->deleteEntityNameToTidMapFromCache(StandardNames::TYPE_ENTITY_TYPE);
                throw new DataConsistencyException("No EntityType tid found for type '$typeName'");
            }
        }
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
                'predicate' => EntitySystem::RELATION_HAS_TYPE,
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
                'predicate' => EntitySystem::ATTRIBUTE_NAME,
                'cancelled' => 0
            ]);
            if (count($rows) === 0 || $rows[0]['value'] === '') {
                throw new DataConsistencyException("No name for '$typeName' entity $entity");
            }
            if (count($rows) > 1 ) {
                throw new DataConsistencyException("Multiple names for '$typeName' entity $entity");
            }
            $tids[$rows[0]['value']] = $entity;
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
            $map = unserialize($this->systemDataCache->get($cacheKey));
        } catch (KeyNotInCacheException) {
//            $this->debugMsg("EntityNameToTidMap for $typeName not in cache, building from statements");
            $table = $this->getStatementsTableForType($typeName);
            $typeTid = $this->getTypeTid($typeName);
            $map = $this->getNameToTidMapFromStatements($table, $typeTid, $typeName);
//            $this->codeDebug("map", $map);
            $this->systemDataCache->set($cacheKey, serialize($map));
        }
        return $map;
    }

    private function deleteEntityNameToTidMapFromCache(string $typeName) : void {
        $cacheKey = $this->genCacheKey(self::CACHE_KEY_PREFIX_NAME_TO_TID . $typeName);
        $this->systemDataCache->delete($cacheKey);
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
        foreach($this->typesConfig as $typeName => $typeConfig) {
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
        foreach($this->typesConfig as $typeName => $spec) {
            if ($typeName=== $type || $spec['typeTid'] === $type) {
                return $spec['statementsTable'] ?? $this->defaultStatementsTable;
            }
        }
        throw new InvalidTypeException();
    }

    protected function storeStatement(DataTable $statementsTable,
                                      int $subject, int $predicate, int|string $valueOrObject,
                                      int $editedBy, int $timestamp, string $editorialNote) : int {

        $statementTid = $this->getUniqueTid();
        $row = [
            'id' => 0,
            'tid' => $statementTid,
            'subject' => $subject,
            'predicate' => $predicate,
            'object' => -1,
            'value' => '',
            'editedBy' => $editedBy,
            'editTimestamp' => $timestamp,
            'editorialNote' => $editorialNote,
            'fromDate' => '',
            'untilDate' => '',
            'seq' => 0,
            'cancelled' => 0,
            'cancelledBy' => -1,
            'cancellationTimestamp' => 0,
            'cancellationNote' => '',
            'statementGroup' => -1,
        ];

        if (is_int($valueOrObject)) {
            $row['object'] = $valueOrObject;
        } else {
            $row['value'] = $valueOrObject;
        }

        $statementsTable->createRow($row);
        return $statementTid;
    }

    private function setupEntityInStatementsTable(DataTable $statementsTable, int $tid, int $typeTid,
                                                  string $name, string  $description, string $editorialNote, int $ts, int $editedBy) : void {
        $this->storeStatement($statementsTable,
            $tid,
            EntitySystem::RELATION_HAS_TYPE,
            $typeTid,
            $editedBy, $ts, $editorialNote
        );
        $this->storeStatement($statementsTable,
            $tid,
            EntitySystem::ATTRIBUTE_NAME,
            $name,
            $editedBy, $ts, $editorialNote
        );
        $this->storeStatement($statementsTable,
            $tid,
            EntitySystem::ATTRIBUTE_DESCRIPTION,
            $description,
            $editedBy, $ts, $editorialNote
        );
    }

    private function setupTypeInStatementsTable(DataTable $statementsTable, int $typeTid, string $name, string $description, bool $hasUniqueNames, int $ts, int $editedBy) : void {
        $typeNameString = sprintf("%s:%s", StandardNames::TYPE_ENTITY_TYPE, $name);
        $editorialNote = "Setting up $typeNameString";
        $this->setupEntityInStatementsTable($statementsTable, $typeTid, self::ENTITY_TYPE__ENTITY_TYPE, $name, $typeNameString, $editorialNote, $ts, $editedBy);
        $this->storeStatement($statementsTable,
            $typeTid,
            EntitySystem::ATTRIBUTE_HAS_UNIQUE_NAMES,
            $hasUniqueNames ? StandardNames::VALUE_TRUE : StandardNames::VALUE_FALSE,
            $editedBy, $ts, $editorialNote
        );
    }

    /**
     * @throws InvalidTypeException
     * @throws InvalidNameException
     * @throws DataConsistencyException
     */
    protected function bootStrap() : void {

        $bootstrapTimestamp = time();
        $this->logger->info("Bootstrapping the entity system at timestamp $bootstrapTimestamp");
        $entityTypeStatementsTable = $this->getStatementsTableForType(StandardNames::TYPE_ENTITY_TYPE);

        $this->setupTypeInStatementsTable($entityTypeStatementsTable,
            EntitySystem::ENTITY_TYPE__ENTITY_TYPE,
            StandardNames::TYPE_ENTITY_TYPE,
            'an entity type',
            true,
            $bootstrapTimestamp,
            $this->systemTid
        );

        $this->setupTypeInStatementsTable($entityTypeStatementsTable,
            EntitySystem::ENTITY_TYPE__ATTRIBUTE,
            StandardNames::TYPE_ATTRIBUTE,
            'a predicate that has literal values as its object',
            true,
            $bootstrapTimestamp,
            $this->systemTid
        );

        $this->setupTypeInStatementsTable($entityTypeStatementsTable,
            EntitySystem::ENTITY_TYPE__RELATION,
            StandardNames::TYPE_RELATION,
            'a predicate that has entities as its object',
            true,
            $bootstrapTimestamp,
            $this->systemTid
        );

        // Create standard entity types
        $this->createEntityType(
            StandardNames::TYPE_DATA_TYPE,
            'e.g, integer, string, etc', true,
            $this->systemTid, $bootstrapTimestamp);
        $this->createEntityType(
            StandardNames::TYPE_STATEMENT,
            "a subject-predicate-object assertion done by a person in the system", false,
            $this->systemTid, $bootstrapTimestamp);
        $this->createEntityType(
            StandardNames::TYPE_STATEMENT_GROUP,
            "a group of statements", false,
            $this->systemTid, $bootstrapTimestamp);
        $this->createEntityType(
            StandardNames::TYPE_PERSON,
            'Normally a human being', false,
            $this->systemTid, $bootstrapTimestamp);
        $this->createEntityType(
            StandardNames::TYPE_PLACE,
            'A geographical place', false,
            $this->systemTid, $bootstrapTimestamp);
        $this->createEntityType(
            StandardNames::TYPE_AREA,
            'A geographical area', false,
            $this->systemTid, $bootstrapTimestamp);


        // Set up the fundamental attributes
        $attributeStatementsTable = $this->getStatementsTableForType(StandardNames::TYPE_ATTRIBUTE);
        $this->setupEntityInStatementsTable($attributeStatementsTable,
            EntitySystem::ATTRIBUTE_NAME,
            EntitySystem::ENTITY_TYPE__ATTRIBUTE,
            StandardNames::ATTRIBUTE_NAME,
            "The entity's name",
            'Setting up the Setting up the Attribute:name entity',
            $this->systemTid, $bootstrapTimestamp);
        $this->setupEntityInStatementsTable($attributeStatementsTable,
            EntitySystem::ATTRIBUTE_DESCRIPTION,
            EntitySystem::ENTITY_TYPE__ATTRIBUTE,
            StandardNames::ATTRIBUTE_DESCRIPTION,
            "A short description of the entity",
            'Setting up the Setting up the Attribute:descriptions entity',
            $this->systemTid, $bootstrapTimestamp);

        $this->setupEntityInStatementsTable($attributeStatementsTable,
            EntitySystem::ATTRIBUTE_HAS_UNIQUE_NAMES,
            EntitySystem::ENTITY_TYPE__ATTRIBUTE,
            StandardNames::ATTRIBUTE_HAS_UNIQUE_NAMES,
            "Indicates if a type has entities with unique names",
            'Setting up the Setting up the Attribute:hasUniqueNames entity',
            $this->systemTid, $bootstrapTimestamp);


        // Create standard attributes
        $this->createEntity(StandardNames::TYPE_ATTRIBUTE,
            StandardNames::ATTRIBUTE_ALIAS,
            "An entity's alias",
            $this->systemTid, $bootstrapTimestamp);
        $this->createEntity(StandardNames::TYPE_ATTRIBUTE,
            StandardNames::ATTRIBUTE_EDIT_TIMESTAMP,
            "A statement's edit timestamp",
            $this->systemTid, $bootstrapTimestamp);
        $this->createEntity(StandardNames::TYPE_ATTRIBUTE,
            StandardNames::ATTRIBUTE_EDITORIAL_NOTE,
            "A note about a statement",
            $this->systemTid, $bootstrapTimestamp);
        $this->createEntity(StandardNames::TYPE_ATTRIBUTE,
            StandardNames::ATTRIBUTE_ANNOTATION,
            "Free text information about an entity",
            $this->systemTid, $bootstrapTimestamp);
        $this->createEntity(StandardNames::TYPE_ATTRIBUTE,
            StandardNames::ATTRIBUTE_IS_MERGED,
            "Indicates whether an entity has been merged into another or not",
            $this->systemTid, $bootstrapTimestamp);

        $this->createEntity(StandardNames::TYPE_ATTRIBUTE,
            StandardNames::ATTRIBUTE_MERGE_TIMESTAMP,
            "timestamp for the merge operation",
            $this->systemTid, $bootstrapTimestamp);

        // Set up the fundamental hasType relation
        $relationStatementsTable = $this->getStatementsTableForType(StandardNames::TYPE_RELATION);

        $this->setupEntityInStatementsTable($relationStatementsTable,
            EntitySystem::RELATION_HAS_TYPE,
            EntitySystem::ENTITY_TYPE__RELATION,
            StandardNames::RELATION_HAS_TYPE,
            "The entity's type",
            'Setting up the Setting up the Relation:hasType entity',
            $this->systemTid, $bootstrapTimestamp);

        // Create standard relations
        $this->createEntity(StandardNames::TYPE_RELATION,
            StandardNames::RELATION_MERGED_INTO,
        "The entity into which an entity has been merged",
            $this->systemTid, $bootstrapTimestamp);
        $this->createEntity(StandardNames::TYPE_RELATION,
            StandardNames::RELATION_EDITED_BY,
            "The author of a statement",
            $this->systemTid, $bootstrapTimestamp);
        $this->createEntity(StandardNames::TYPE_RELATION,
            StandardNames::RELATION_MERGED_BY,
            "The author of a merge operation",
            $this->systemTid, $bootstrapTimestamp);

        // Create data types
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
     *
     * @throws DataConsistencyException
     * @throws InvalidArgumentException
     */
    public function cancelStatement(int $statementTid, int $cancelledBy, string $cancellationNote,
                                    string|int $subjectType = '', int $ts = -1) : void
    {
        if ($subjectType !== '') {
            try {
                $subjectType = $this->getTypeNameFromStringOrInt($subjectType);
            } catch (InvalidTypeException|EntityDoesNotExistException) {
                throw new InvalidArgumentException("Given subject type $subjectType is not valid");
            }

        }
        /** @var DataTable[] $tablesToCheck */
        $tablesToCheck = [];
        if ($subjectType !== '') {
            $tablesToCheck[] = $this->typesConfig[$subjectType]['statementsTable'];
        } else {
            foreach ($this->typesConfig as $typeConfig) {
                if (!in_array($typeConfig['statementsTable'], $tablesToCheck)) {
                    $tablesToCheck[] = $typeConfig['statementsTable'];
                }
            }
        }

        foreach ($tablesToCheck as $table) {
            $rows = $table->findRows(['tid' => $statementTid]);
            if (count($rows) === 1) {
                // found it
                $newRow = $rows[0];
                $newRow['cancelled'] = 1;
                $newRow['cancelledBy'] = $cancelledBy;
                $newRow['cancellationNote'] = $cancellationNote;
                $newRow['cancellationTimestamp'] = $ts === -1 ? time() : $ts;
                $table->updateRow($newRow);
                return;
            }
        }

        throw  new InvalidArgumentException("Statement $statementTid not found");
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
        foreach ($this->typesConfig as $typeConfig) {
            if ($entityTid === $typeConfig['typeTid']) {
                // it's a type
                return EntitySystem::ENTITY_TYPE__ENTITY_TYPE;
            }
            /** @var DataTable $table */
            $table = $typeConfig['statementsTable'];
            if (!in_array($table, $tablesSearched)) {
                $rows = $table->findRows([ 'subject' => $entityTid, 'predicate' => EntitySystem::RELATION_HAS_TYPE, 'cancelled' => 0]);
                if (count($rows) === 1) {
                    return $rows[0]['object'];
                }
                if (count($rows) > 1) {
                    $this->logger->error("Found more than one type-assignment statement for entity $entityTid", $rows);
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
        if ($type === StandardNames::TYPE_ENTITY_TYPE || $type === EntitySystem::ENTITY_TYPE__ENTITY_TYPE) {
            // look into type config
            foreach ($this->typesConfig as $typeName => $typeConfig) {
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
        if (!isset($this->typesConfig[$typeName])) {
            $this->logger->error("No configuration for type '$typeName'");
            throw new DataConsistencyException();
        }

        // statements and statement groups do not have names
        if ($typeName === StandardNames::TYPE_STATEMENT || $typeName === StandardNames::TYPE_STATEMENT_GROUP) {
            return '';
        }

        if ($this->typesConfig[$typeName]['uniqueNames']) {
            // look into the name to tid map
            $map = $this->getEntityNameToTidMap($typeName);
            foreach($map as $name => $tid) {
                if ($tid === $entityTid) {
                    return $name;
                }
            }
        } else {
            // look into statements
            $table =$this->typesConfig[$typeName]['statementsTable'];
            $rows = $table->findRows([ 'subject' => $entityTid, 'predicate' => EntitySystem::ATTRIBUTE_NAME, 'cancelled' => 0]);
            if (count($rows) === 1) {
                return $rows[0]['value'];
            }
            if (count($rows) > 1) {
                // a data error
                $this->logger->error("Found more than one name for entity $entityTid of type $typeName");
                // but this should not break the system
                return $rows[0]['value'];
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
     * @throws EntityDoesNotExistException
     * @throws InvalidArgumentException
     * @throws DataConsistencyException
     */
    public function makeStatement(int $subjectTid, int|string $predicate, int|string $valueOrObject, array $qualifications, int $editedByPersonTid, string $editorialNote, array $extraStatementMetadata = [], int $statementGroupTid = -1, int $ts = -1): int
    {
        // TODO: implement qualifications and statement metadata
        if ($subjectTid === -1) {
            throw new InvalidArgumentException("Subject entity does not exist");
        }
        $predicateTid = -1;
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
        $entityTypeTid = -1;
        try {
            $entityTypeTid = $this->getEntityType($subjectTid);
        } catch(EntityDoesNotExistException) {
            throw new InvalidArgumentException("Subject entity does not exist");
        }

        $table = $this->getStatementsTableForType($entityTypeTid);
        if ($ts === -1) {
            $ts = time();
        }

        switch ($predicateType) {
            case  EntitySystem::ENTITY_TYPE__ATTRIBUTE:
                $value = strval($valueOrObject);
                $this->storeStatement($table, $subjectTid, $predicateTid, $value,
                    $editedByPersonTid, $ts, $editorialNote);
                break;

            case EntitySystem::ENTITY_TYPE__RELATION:
                $objectTid = $valueOrObject;
                if (is_string($valueOrObject)) {
                    $objectTid = $this->getTidByTypeAndName($valueOrObject);
                }
                try {
                    $objectTypeTid = $this->getEntityType($objectTid);
                } catch (EntityDoesNotExistException) {
                    throw new InvalidArgumentException("Object entity $valueOrObject does not exist");
                }
                // TODO: check type restrictions for relation
                $this->storeStatement($table, $subjectTid, $predicateTid, $objectTid,
                    $editedByPersonTid, $ts, $editorialNote);
                break;

            default:
                throw new InvalidArgumentException("Predicate $predicate is not an attribute or a relation");

        }

        return $statementTid;
    }

    /**
     * @throws InvalidTypeException
     * @throws EntityDoesNotExistException
     * @throws DataConsistencyException
     */
    public function getEntityStatements(int|string $entityId, int|string $entityType = ''): array
    {
        $entityTid = $entityId;
        if (is_string($entityId)) {
            $entityTid = $this->getTidByTypeAndName($entityId);
        }
        $entityTypeName = $entityType;
        $entityTypeTid = -1;
        if (is_int($entityType)) {
            try {
                $entityTypeName = $this->getEntityName($entityType, StandardNames::TYPE_ENTITY_TYPE);
            } catch (EntityDoesNotExistException) {
                throw new InvalidTypeException("Type $entityType not valid");
            }
        } else {
            // given entity type is a string
            if ($entityType === '') {
                // no type given, get it from the system
                $entityTypeTid = $this->getEntityType($entityTid);
                $entityTypeName = $this->getEntityName($entityTypeTid, StandardNames::TYPE_ENTITY_TYPE);
            } else {
                // see if the type is valid
                $entityTypeTid = $this->getTypeTid($entityType);
            }
        }

        $cacheKey = self::CACHE_KEY_PREFIX_ENTITY_DATA . $entityTid;
        /** @var DataCache $cache */
        $cache = $this->typesConfig[$entityTypeName]['dataCache'];
        try {
            $statements = unserialize($cache->get($cacheKey));
        } catch (KeyNotInCacheException) {
            // need to rebuild
            $statements = $this->getEntityStatementsAsSubject($entityTid, $entityTypeName);
            $statementsAsObject = $this->getEntityStatementsAsObject($entityTid, $entityTypeName);
            foreach($statementsAsObject as $statement) {
                $statements[] = $statement;
            }
            $cache->set($cacheKey, serialize($statements), $this->typesConfig[$entityTypeName]['defaultCacheTtl']);
        }
        return $statements;
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

    protected function getEntityStatementsAsObject(int $entityTid, string $entityTypeName) : array {
        // for now, a brute force search in all statement tables
        $tablesSearched = [];
        $statements = [];
        foreach($this->typesConfig as $typeConfig) {
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
        foreach ($this->typesConfig as $name => $typeConfig) {
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
        if ($name !== '' && ($typeNameOrType === StandardNames::TYPE_ENTITY_TYPE || $typeNameOrType === EntitySystem::ENTITY_TYPE__ENTITY_TYPE)){
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

        foreach($this->typesConfig as $typeName => $typeConfig) {
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
        if (isset($this->typesConfig[$typeName])){
            $this->typesConfig[$typeName]['typeTid'] = $tid;
            $this->typesConfig[$typeName]['uniqueNames'] = $uniqueNames;
        } else {
            $this->typesConfig[$typeName] = [
                'typeTid' => $tid,
                'uniqueNames' => $uniqueNames,
                'statementsTable' => $this->defaultStatementsTable,
                'dataCache' => $this->systemDataCache,
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
        if ($this->typesConfig[$typeName]['uniqueNames']) {
            return array_values($this->getEntityNameToTidMap($typeName));
        }
        // look in statements
        $tids = [];
        /** @var DataTable $table */
        $table = $this->typesConfig[$typeName]['statementsTable'];
        $rows = $table->findRows( ['predicate' => EntitySystem::RELATION_HAS_TYPE, 'object' => $typeTid, 'cancelled' => 0]);
        foreach($rows as $row) {
            $tids[] = $row['subject'];
        }
        return $tids;
    }

}