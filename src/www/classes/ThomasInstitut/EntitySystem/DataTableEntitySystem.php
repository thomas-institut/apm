<?php

namespace ThomasInstitut\EntitySystem;

use ThomasInstitut\DataCache\DataCache;
use ThomasInstitut\DataCache\CacheAware;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\DataCache\SimpleCacheAware;
use ThomasInstitut\DataTable\DataTable;



/**
 * An implementation of an entity system using general caching and DataTable objects as storage.
 *
 * In order to function the system needs at least a table to store statements and a DataCache.
 * Statement data can be partitioned based on entity type, so additional statement tables can be
 * configured.
 *
 * A statements table should have the following columns:
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
class DataTableEntitySystem implements EntitySystem, CacheAware
{

    use SimpleCacheAware;

    const CACHE_KEY_TYPE_TIDS = 'typeTids';
    const CACHE_KEY_PREFIX_NAME_TO_TID = 'nameToTidMap';

    const PREDICATE_ATTRIBUTE = 'A';
    const PREDICATE_RELATION = 'R';

    private DataTable $defaultStatementsTable;
    /**
     * @var array
     */
    private array $namedTypesTables;
    /**
     * @var string[]
     */
    private array $namedTypes;
    private int $systemTid = -1;

    private array $typesToTableSpec;
    private string $cachingPrefix;
    /**
     * @var array[]
     */
    private array $typesConfig;
    /**
     * @var DataTable
     */
    private DataTable $systemStatementsTable;
    private DataCache $systemDataCache;


    /**
     * Construct an entity system based on the given data tables and cache.
     *
     * Each textual key in the given $tableConfig associative array configures the storage
     * for entities of a given type:
     *   'someTypeName' =>  [
     *      'statementsTable' => someDataTable,
     *      'dataCache' => someDataCacheObject,
     *      'uniqueNames' => true|false
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
     * @throws InvalidArgumentException
     * @throws DataConsistencyException
     */
    public function __construct(array $config, string $cachingPrefix = '')
    {
        $this->cachingPrefix = $cachingPrefix;
        $this->systemTid = EntitySystem::SYSTEM;

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

        $this->typesConfig = [
            StandardNames::TYPE_ENTITY_TYPE => [
                'typeTid' => EntitySystem::ENTITY_TYPE__ENTITY_TYPE,
                'uniqueNames' => true,
                'statementsTable' => $this->systemStatementsTable,
                'dataCache' => $this->systemDataCache,
                'cacheAll' => true
            ],
            StandardNames::TYPE_ATTRIBUTE => [
                'typeTid' => -1,
                'uniqueNames' => true,
                'statementsTable' => $this->systemStatementsTable,
                'dataCache' => $this->systemDataCache,
                'cacheAll' => true
            ],
            StandardNames::TYPE_RELATION => [
                'typeTid' => -1,
                'uniqueNames' => true,
                'statementsTable' => $this->systemStatementsTable,
                'dataCache' => $this->systemDataCache,
                'cacheAll' => true
            ],
            StandardNames::TYPE_DATA_TYPE => [
                'typeTid' => -1,
                'uniqueNames' => true,
                'statementsTable' => $this->systemStatementsTable,
                'dataCache' => $this->systemDataCache,
                'cacheAll' => true
            ],
        ];

        foreach($typeConfigArray as $type => $typeConfig) {
            if (isset($typeConfig['statementsTable'])) {
                if(!is_a($typeConfig['statementsTable'], DataTable::class)){
                    throw new InvalidArgumentException("Statements table for type '$type' not a DataTable object");
                }
                $this->typesConfig[$type]['statementsTable'] = $typeConfig['statementsTable'];
            }
            if (isset($typeConfig['dataCache'])) {
                if(!is_a($typeConfig['dataCache'], DataCache::class)){
                    throw new InvalidArgumentException("Data cache for type '$type' not a DataCache object");
                }
                $this->typesConfig[$type]['dataCache'] = $typeConfig['dataCache'];
            }
            if (isset($typeConfig['uniqueNames'])) {
                $this->typesConfig[$type]['uniqueNames'] = $typeConfig['uniqueNames'];
            }
        }

        // Fill in type tids in $this->typesConfig, bootstrap if needed
        $typeTids = [];
        try {
            $typeTids = unserialize($this->systemDataCache->get($this->genCacheKey(self::CACHE_KEY_TYPE_TIDS)));
        } catch (KeyNotInCacheException) {
            /** @var DataTable $statementsTable */
            $statementsTable = $this->typesConfig[StandardNames::TYPE_ENTITY_TYPE]['statementsTable'];
            $rows = $statementsTable->findRows([
                'predicate' => EntitySystem::RELATION__HAS_TYPE,
                'object' => EntitySystem::ENTITY_TYPE__ENTITY_TYPE]
            );
            if (count($rows) === 0) {
                $this->bootStrap();
            }
            $typeEntities = [];
            foreach ($rows as $row) {
                $typeEntities[] = $row['subject'];
            }
            foreach($typeEntities as $typeEntity) {
                if ($typeEntity === EntitySystem::ENTITY_TYPE__ENTITY_TYPE) {
                    // no need to check the EntityType type
                    continue;
                }
                $rows = $statementsTable->findRows([
                    'subject' => $typeEntity,
                    'predicate' => EntitySystem::ATTRIBUTE__NAME
                ]);
                if (count($rows) === 0 || $rows[0]['value'] === '') {
                    throw new DataConsistencyException("No name for EntityType entity $typeEntity");
                }
                if (count($rows) > 1 ) {
                    throw new DataConsistencyException("Multiple names for EntityType entity $typeEntity");
                }
                $typeTids[$rows[0]['value']] = $typeEntity;
            }
            $this->systemDataCache->set($this->genCacheKey(self::CACHE_KEY_TYPE_TIDS), serialize($typeTids));
        }
        foreach($typeTids as $typeName => $typeTid) {
            $this->typesConfig[$typeName]['typeTid'] = $typeTid;
        }
        // check that all types have a valid type tid
        foreach($this->typesConfig as $typeName => $typeConfig) {
            if (!isset($typeConfig['typeTid']) || $typeConfig['typeTid'] === -1) {
                $this->systemDataCache->delete($this->genCacheKey(self::CACHE_KEY_TYPE_TIDS));
                throw new DataConsistencyException("No EntityType tid found for type '$typeName'");
            }
        }
    }

    private function genCacheKey(string $key) : string {
        return $this->cachingPrefix . '__' . $key;
    }

    public function getUniqueTid(): int
    {
       return Tid::generateUnique();
    }


    public function printInternalData() : void{
        print "System Tid\n   $this->systemTid\n";
        foreach($this->typesConfig as $typeName => $typeConfig) {
            printf("Type config for type %s (tid %d)\n", $typeName, $typeConfig['typeTid']);
            $this->printDataTable('', $typeConfig['statementsTable']);
        }

        $this->printDataTable('Default statements', $this->defaultStatementsTable);
    }

    private function printDataTable(string $title, DataTable $dt) : void {
        print "DataTable: $title\n";
        $rows = $dt->getAllRows();
        foreach($rows as $row) {
            $values = array_values($row);
            print "   " . implode(', ', $values) . "\n";
        }
    }

    private function nameExistsInType(string|int $type, string $name) : bool{
        return $this->getEntityTidByTypeAndName($type, $name) !== -1;
    }

    /**
     * @throws InvalidTypeException
     */
    private function getEntityNameToTidMap(string $type) : array {

        $key = $this->genCacheKey(self::CACHE_KEY_PREFIX_NAME_TO_TID . '_' . $type);
        $map = [];
        try {
            $map = unserialize($this->systemDataCache->get($key));
        } catch (KeyNotInCacheException) {
            $table = $this->getStatementsTableForType($type);
            $typeTid = $this->getTidByTypeName('EntityType', $type);

            $entities = [];
            $rows = $table->findRows([ 'predicate' => EntitySystem::RELATION__HAS_TYPE, 'object' => $typeTid]);
            foreach($rows as $row) {
                $entities[] = $row['subject'];
            }
            foreach($entities as $entity) {
                $rows = $table->findRows([ 'subject' => $entity, 'predicate' => self::ATTRIBUTE__NAME, 'cancelled' => 0]);
                $map[$rows[0]['value']] = $entity;
            }
            $this->systemDataCache->set($key, serialize($map));
        }
        return $map;
    }


    public function getEntityTidByTypeAndName(string|int $type, string $name) : int {
        if ($type === -1 || $type === '') {
            return -1;
        }
        if ($type === EntitySystem::ENTITY_TYPE__ENTITY_TYPE || $type === StandardNames::TYPE_ENTITY_TYPE) {
            // look in type config
            foreach($this->typesConfig as $typeName => $typeConfig) {
                if ($name === $typeName) {
                    return $typeConfig['typeTid'];
                }
            }
        }

        foreach($this->typesConfig as $typeName => $typeConfig) {
            if ($type === $typeName || $type === $typeConfig['typeTid']) {
                $uniqueNames = $typeConfig['uniqueNames'] ?? false;
                if (!$uniqueNames) {
                    // this function only works with types with uniquely named entities
                    return -1;
                }

            }
        }

        foreach($this->typesToTableSpec as $spec) {
            if ($spec['typeTid'] === $type || $spec['typeName']===$type) {
                $rows = $spec['table']->findRows(['name' => $name]);
                if (count($rows) === 0) {
                    return -1;
                }
                return $rows[0]['tid'];
            }
        }
        return -1;
    }

    /**
     * @throws InvalidTypeException
     * @throws InvalidNameException
     * @throws InvalidAttributeException
     * @throws InvalidRelationException
     */
    public function createEntity(string|int $type, string $name = '', string $description = '', int $createdBy = -1) : int {
        if ($type === '') {
            throw new InvalidTypeException("Empty type string given");
        }
        $typeTid = $this->getEntityTidByTypeAndName(StandardNames::TYPE_ENTITY_TYPE, $type);
        if ($typeTid === -1) {
            throw new InvalidTypeException("Type '$type' is not defined in the system");
        }

        $newTid = $this->getUniqueTid();
        if ($createdBy === -1) {
            $createdBy = $this->systemTid;
        }
        foreach($this->typesToTableSpec as $spec) {
            if ($spec['typeTid'] === $type || $spec['typeName'] === $type) {
                // use table
                if ($spec['uniqueNames'] && $name === '') {
                    throw new InvalidNameException("Name cannot be empty for entities of type '$type'");
                }
                if ($spec['uniqueNames'] && $this->nameExistsInType($type, $name)) {
                    throw new InvalidNameException("Name already exists, creating entity of type '$type', name '$name'");
                }
                $spec['table']->createRow([
                        'tid' => $newTid,
                        'name' => $name,
                        'description' => "EntityType:EntityType",
                        'statementTid' => $this->getUniqueTid(),
                        'editedBy' => $createdBy,
                        'timestamp' => time(),
                        'statementNote' => "Creating entity of type $type with name '$name'",
                        'cancellationTid' => -1,
                        'cancelledBy' => -1,
                        'cancellationTimestamp' => 0,
                        'cancellationNote' => '',
                        'mergedInto' => -1,
                        'mergeTid' => -1,
                        'mergedBy' => -1,
                        'mergeTimestamp' => 0,
                        'mergeNote' => ''
                    ]
                );
                return $newTid;
            }
        }

        // need to use general statement table

        $creationTs = time();

        $statementTid = $this->makeAttributeStatement($newTid, StandardNames::ATTRIBUTE_CREATED, StandardNames::VALUE_TRUE, [], $createdBy, $creationTs);
        if ($statementTid === -1) {
            //print "Error: cannot make creation attribute statement for entity of type $type (type tid $typeTid)\n";
            return -1;
        }
        $this->makeRelationStatement($newTid, StandardNames::RELATION_HAS_TYPE, $typeTid, [], $createdBy, $creationTs );
        if ($name !== '') {
            $this->makeAttributeStatement($newTid, StandardNames::ATTRIBUTE_NAME, $name, [], $createdBy, $creationTs);
        }
        if ($description !== '') {
            $this->makeAttributeStatement($newTid, StandardNames::ATTRIBUTE_DESCRIPTION, $description, [], $createdBy, $creationTs);
        }
        return $newTid;
    }

    /**
     * @throws InvalidTypeException
     */
    private function getStatementsTableForType(string|int $type) : DataTable {
        foreach($this->typesConfig as $typeName => $spec) {
            if ($typeName=== $type || $spec['typeTid'] === $type) {
                return $spec['statementsTable'];
            }
        }
        throw new InvalidTypeException();
    }

    protected function storeStatement(DataTable $statementsTable,
                                      int $subject, int $predicate, int|string $valueOrObject,
                                      int $editedBy, int $timestamp, string $editorialNote) : int {

        $statementTid = $this->getUniqueTid();
        $row = [
            'tid' => $statementTid,
            'subject' => $subject,
            'predicate' => $predicate,
            'editedBy' => $editedBy,
            'editTimestamp' => $timestamp,
            'editorialNote' => $editorialNote,
            'cancelled' => 0,
            'cancelledBy' => -1,
            'cancellationTimestamp' => 0,
            'cancellationNote' => '',
        ];

        if (is_int($valueOrObject)) {
            $row['object'] = $valueOrObject;
        } else {
            $row['value'] = $valueOrObject;
        }

        $statementsTable->createRow($row);
        return $statementTid;
    }

    /**
     * @throws InvalidTypeException
     * @throws InvalidNameException
     * @throws InvalidAttributeException
     * @throws InvalidRelationException
     */
    protected function bootStrap() : void {

        $bootstrapTimestamp = time();
        $entityTypeStatementsTable = $this->getStatementsTableForType(StandardNames::TYPE_ENTITY_TYPE);

        // set up the EntityType:EntityType entity
        $this->storeStatement($entityTypeStatementsTable,
            EntitySystem::ENTITY_TYPE__ENTITY_TYPE,
            EntitySystem::RELATION__HAS_TYPE,
            EntitySystem::ENTITY_TYPE__ENTITY_TYPE,
            $this->systemTid, $bootstrapTimestamp, 'Setting up the EntityType:EntityType entity'
        );
        $this->storeStatement($entityTypeStatementsTable,
            EntitySystem::ENTITY_TYPE__ENTITY_TYPE,
            EntitySystem::ATTRIBUTE__NAME,
            StandardNames::TYPE_ENTITY_TYPE,
            $this->systemTid, $bootstrapTimestamp, 'Setting up the EntityType:EntityType entity'
        );
        $this->storeStatement($entityTypeStatementsTable,
            EntitySystem::ENTITY_TYPE__ENTITY_TYPE,
            EntitySystem::ATTRIBUTE__DESCRIPTION,
            StandardNames::TYPE_ENTITY_TYPE . ':' . StandardNames::TYPE_ENTITY_TYPE,
            $this->systemTid, $bootstrapTimestamp, 'Setting up the EntityType:EntityType entity'
        );


        // Create standard entity types
        $this->createEntity(StandardNames::TYPE_ENTITY_TYPE,
            StandardNames::TYPE_NO_TYPE, 'The type for entities without a type');
        $entityTypeAttribute = $this->createEntity(StandardNames::TYPE_ENTITY_TYPE,
            StandardNames::TYPE_ATTRIBUTE, 'a predicate that has literal values as its object');
        $entityTypeRelation = $this->createEntity(StandardNames::TYPE_ENTITY_TYPE,
            StandardNames::TYPE_RELATION, 'a predicate that has entities as its object');
        $this->createEntity(StandardNames::TYPE_ENTITY_TYPE,
            StandardNames::TYPE_DATA_TYPE, 'e.g, integer, string, etc');
        $this->createEntity(StandardNames::TYPE_ENTITY_TYPE,
            StandardNames::TYPE_STATEMENT,  "a subject-predicate-object assertion done by a person in the system");
        $this->createEntity(StandardNames::TYPE_ENTITY_TYPE,
            StandardNames::TYPE_STATEMENT_GROUP,  "a group of statements");
        $this->createEntity(StandardNames::TYPE_ENTITY_TYPE,
            StandardNames::TYPE_PERSON, 'Normally a human being');
        $this->createEntity(StandardNames::TYPE_ENTITY_TYPE,
            StandardNames::TYPE_PLACE, 'A geographical place');

        // Set up the two fundamental attributes: name and description
        $attributeStatementsTable = $this->getStatementsTableForType(StandardNames::TYPE_ATTRIBUTE);
        $this->storeStatement($attributeStatementsTable,
            EntitySystem::ATTRIBUTE__NAME,
            EntitySystem::RELATION__HAS_TYPE,
            $entityTypeAttribute,
            $this->systemTid, $bootstrapTimestamp, 'Setting up the Setting up the Attribute:name entity'
        );
        $this->storeStatement($attributeStatementsTable,
            EntitySystem::ATTRIBUTE__NAME,
            EntitySystem::ATTRIBUTE__NAME,
            StandardNames::ATTRIBUTE_NAME,
            $this->systemTid, $bootstrapTimestamp, 'Setting up the Setting up the Attribute:name entity'
        );
        $this->storeStatement($attributeStatementsTable,
            EntitySystem::ATTRIBUTE__NAME,
            EntitySystem::ATTRIBUTE__DESCRIPTION,
            "The entity's name",
            $this->systemTid, $bootstrapTimestamp, 'Setting up the Setting up the Attribute:name entity'
        );

        $this->storeStatement($attributeStatementsTable,
            EntitySystem::ATTRIBUTE__DESCRIPTION,
            EntitySystem::RELATION__HAS_TYPE,
            $entityTypeAttribute,
            $this->systemTid, $bootstrapTimestamp, 'Setting up the Setting up the Attribute:description entity'
        );
        $this->storeStatement($attributeStatementsTable,
            EntitySystem::ATTRIBUTE__DESCRIPTION,
            EntitySystem::ATTRIBUTE__NAME,
            StandardNames::ATTRIBUTE_DESCRIPTION,
            $this->systemTid, $bootstrapTimestamp, 'Setting up the Setting up the Attribute:description entity'
        );
        $this->storeStatement($attributeStatementsTable,
            EntitySystem::ATTRIBUTE__DESCRIPTION,
            EntitySystem::ATTRIBUTE__DESCRIPTION,
            "A short description of the entity",
            $this->systemTid, $bootstrapTimestamp, 'Setting up the Setting up the Attribute:description entity'
        );

        // Create standard attributes
        $this->createEntity(StandardNames::TYPE_ATTRIBUTE, StandardNames::ATTRIBUTE_ALIAS);
        $this->createEntity(StandardNames::TYPE_ATTRIBUTE, StandardNames::ATTRIBUTE_TIMESTAMP);

        // Set up the fundamental hasType relation
        $relationStatementsTable = $this->getStatementsTableForType(StandardNames::TYPE_RELATION);
        $this->storeStatement($relationStatementsTable,
            EntitySystem::RELATION__HAS_TYPE,
            EntitySystem::RELATION__HAS_TYPE,
            $entityTypeRelation,
            $this->systemTid, $bootstrapTimestamp, 'Setting up the Setting up the Relation:hasType entity'
        );
        $this->storeStatement($relationStatementsTable,
            EntitySystem::RELATION__HAS_TYPE,
            EntitySystem::ATTRIBUTE__NAME,
            StandardNames::RELATION_HAS_TYPE,
            $this->systemTid, $bootstrapTimestamp, 'Setting up the Setting up the Relation:hasType entity'
        );
        $this->storeStatement($relationStatementsTable,
            EntitySystem::RELATION__HAS_TYPE,
            EntitySystem::ATTRIBUTE__DESCRIPTION,
            "The entity's name",
            $this->systemTid, $bootstrapTimestamp, 'Setting up the Setting up the Relation:hasType entity'
        );

        // Create standard relations
        $this->createEntity(StandardNames::TYPE_RELATION, StandardNames::RELATION_MERGED_INTO);
        $this->createEntity(StandardNames::TYPE_RELATION, StandardNames::RELATION_EDITED_BY);

        // Create data types
        $this->createEntity(StandardNames::TYPE_DATA_TYPE, StandardNames::DATATYPE_BOOLEAN);
        $this->createEntity(StandardNames::TYPE_DATA_TYPE, StandardNames::DATATYPE_INT);
        $this->createEntity(StandardNames::TYPE_DATA_TYPE, StandardNames::DATATYPE_DATE);
        $this->createEntity(StandardNames::TYPE_DATA_TYPE, StandardNames::DATATYPE_JSON);
        $this->createEntity(StandardNames::TYPE_DATA_TYPE, StandardNames::DATATYPE_NUMBER);
        $this->createEntity(StandardNames::TYPE_DATA_TYPE, StandardNames::DATATYPE_STRING);
        $this->createEntity(StandardNames::TYPE_DATA_TYPE, StandardNames::DATATYPE_TIMESTAMP);
    }


    public function makeAttributeStatement(int $subjectTid, string|int $attribute, string $value, array $qualifications,
                                           int $editedByPersonTid,  array $statementMetadata = [], int $ts = -1): int
    {
        if (is_int($attribute)) {
            try {
                $this->getEntityName($attribute, StandardNames::TYPE_ATTRIBUTE);
            } catch (EntityDoesNotExistException) {
                throw new InvalidAttributeException("Attribute $attribute is not defined");
            }
            $attributeTid = $attribute;
        } else {
            $attributeTid = $this->getEntityTidByTypeAndName(StandardNames::TYPE_ATTRIBUTE, $attribute);
            if ($attributeTid === -1) {
                throw new InvalidAttributeException("Attribute '$attribute' is not defined");
            }
        }

        $statementTid = $this->getUniqueTid();
        $timestamp = $ts === -1 ? time() : $ts;
        $this->defaultStatementsTable->createRow([
            'tid' => $statementTid,
            'predicateType' => self::PREDICATE_ATTRIBUTE,
            'subject' => $subjectTid,
            'predicate' => $attributeTid,
            'object' => -1,
            'value' => $value,
            'qualifications' => $qualifications,
            'editedBy' => $editedByPersonTid,
            'statementNote' => $statementMetadata,
            'timestamp' => $timestamp,
            'cancellationTid' => -1,
            'cancelledBy' => -1,
            'cancellationTimestamp' => -1,
            'cancellationNote'=> ''
        ]);
        return $statementTid;
    }

    public function makeRelationStatement(int $subjectTid, string|int $relation, int $objectTid, array $qualifications,
                                          int $editedByPersonTid, string $statementNote = '', int $ts = -1): int
    {
        if (is_int($relation)) {
            try {
                $this->getEntityName($relation, StandardNames::TYPE_RELATION);
            } catch (EntityDoesNotExistException) {
                throw new InvalidRelationException("Relation $relation is not defined");
            }
            $relationTid = $relation;
        } else {
            $relationTid = $this->getEntityTidByTypeAndName(StandardNames::TYPE_RELATION, $relation);
            if ($relationTid === -1) {
                throw new InvalidRelationException("Relation '$relation' is not defined");
            }
        }
        $statementTid = $this->getUniqueTid();
        $timestamp = $ts === -1 ? time() : $ts;

        $this->defaultStatementsTable->createRow([
            'tid' => $statementTid,
            'predicateType' => self::PREDICATE_RELATION,
            'subject' => $subjectTid,
            'predicate' => $relationTid,
            'object' => $objectTid,
            'value' => '',
            'qualifications' => $qualifications,
            'editedBy' => $editedByPersonTid,
            'statementNote' => $statementNote,
            'timestamp' => $timestamp,
            'cancellationTid' => -1,
            'cancelledBy' => -1,
            'cancellationTimestamp' => -1,
            'cancellationNote'=> ''
        ]);
        return $statementTid;
    }

    public function cancelStatement(int $statementTid, int $cancelledByPersonTid, int $ts = -1): void
    {
        // TODO: implement this!

    }

    public function mergeEntities(int $entityTid, int $intoEntityTid, int $mergedByPersonTid, string $mergeNote, int $ts = -1) : int
    {
        // TODO: Implement mergeEntities() method.
        return -1;
    }

    /**
     * @param int $subjectTid
     * @return StatementData[]
     */
    public function findStatementsBySubject(int $subjectTid) : array {
      return $this->findStatements(['subject' =>$subjectTid]);
    }

    public function findStatementsByObject(int $objectTid) : array {
        return $this->findStatements(['object' => $objectTid]);
    }

    /**
     * @param array $findSpec
     * @return StatementData[]
     */
    private function findStatements(array $findSpec) : array {
        $rows = $this->defaultStatementsTable->findRows($findSpec);
        $statements = [];
        foreach ($rows as $row) {
            $statements[] = $this->statementDataFromRow($row);
        }
        return $statements;
    }

    public function getEntityData(int $entityTid, string|int $type = ''): EntityData
    {
        $data = new EntityData();
        $data->tid = $entityTid;

        $asSubject = $this->findStatementsBySubject($entityTid);

        foreach ($asSubject as $statementData) {
            if ($statementData->isAttribute) {
                $data->attributes[] = $statementData;
            } else {
                $data->relations[] = $statementData;
                if ($statementData->predicate === StandardNames::RELATION_HAS_TYPE) {
                    $data->type = $this->getEntityName($statementData->object, StandardNames::TYPE_ENTITY_TYPE);
                }
            }
        }
        $data->relationsAsObject = $this->findStatementsByObject($entityTid);

        if (count ($data->attributes) !== 0 || count($data->relationsAsObject) !== 0 || count($data->relations) !== 0) {
            $data->isDefined = true;
        }
        return $data;
    }

    public function getEntityName(int $entityTid, string|int $type = '') : string {
        if (is_int($type)) {
            $typeName = $this->getEntityName($type, StandardNames::TYPE_ENTITY_TYPE);
        }

        if (!isset($this->namedTypesTables[$type])) {
            return '';
        }
        $rows = $this->namedTypesTables[$type]->findRows([ 'tid' => $entityTid]);
        if (count($rows) === 0) {
            return '';
        }
        return $rows[0]['name'];
    }


    private function statementDataFromRow(array $row) : StatementData {
        $data = new StatementData();


        $data->tid = $row['tid'];
        $data->isAttribute = $row['predicateType'] === self::PREDICATE_ATTRIBUTE;
        $data->predicate = $row['predicate'];
        if ($data->isAttribute) {
            $data->value = $row['value'];
        } else {
            $data->object = $row['object'];
        }
        $data->editedBy = $row['editedBy'];
        $data->note = $row['statementNote'];
        $data->timestamp = $row['timestamp'];
        $data->isCancelled = $row['cancelledBy'] !== -1;
        if ($data->isCancelled) {
            $data->cancelledBy = $row['cancelledBy'];
            $data->cancellationTimestamp = $row['cancellationTimestamp'];
            $data->cancellationNote = $row['cancellationNote'];
        }
        return $data;
    }

    public function setEntityData(string|int $entityTid, array $predicates, int $editedBy, int $ts = -1) : int
    {
        // TODO: Implement setEntityData() method.
        return -1;
    }

    public function getEntityStatementTuples(int|string $entityId, int|string $entityType): array
    {
       // TODO: Implement getEntityStatementTuples() method.

        return [];
    }

    public function makeStatement(int $subjectTid, int|string $predicate, int|string $valueOrObject, array $qualifications, int $editedByPersonTid, string $editorialNote, array $extraStatementMetadata = [], int $statementGroupTid = -1, int $ts = -1): int
    {
        // TODO: Implement makeStatement() method.
        return -1;
    }

    public function getEntityStatements(int|string $entityId, int|string $entityType = ''): array
    {
        // TODO: Implement getEntityStatements() method.
        return [];
    }

    public function getTidByTypeName(string $typeNameOrType, string $name = ''): int
    {
        // TODO: Implement getTidByTypeName() method.
        return -1;
    }
}