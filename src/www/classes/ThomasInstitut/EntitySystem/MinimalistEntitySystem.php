<?php

namespace ThomasInstitut\EntitySystem;

use ThomasInstitut\DataTable\DataTable;
use ThomasInstitut\DataTable\InMemoryDataTable;
use const Grpc\STATUS_ABORTED;

class MinimalistEntitySystem implements EntitySystem
{

    const PREDICATE_ATTRIBUTE = 'A';
    const PREDICATE_RELATION = 'R';

    private DataTable $statementsTable;
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


    /**
     * @throws InvalidTypeException
     * @throws InvalidNameException
     * @throws InvalidAttributeException|InvalidRelationException
     */
    public function __construct()
    {
        $this->statementsTable = new InMemoryDataTable();
        $this->namedTypesTables = [
            StandardNames::TYPE_ENTITY_TYPE => new InMemoryDataTable(),
            StandardNames::TYPE_ATTRIBUTE => new InMemoryDataTable(),
            StandardNames::TYPE_RELATION => new InMemoryDataTable(),
            StandardNames::TYPE_DATA_TYPE => new InMemoryDataTable()
        ];

        $this->typesToTableSpec = [
            [
                'typeName' => StandardNames::TYPE_ENTITY_TYPE,
                'typeTid' => -1,
                'uniqueNames' => true,
                'tableName' => '',
                'table' => new InMemoryDataTable()
            ],
            [
                'typeName' => StandardNames::TYPE_ATTRIBUTE,
                'typeTid' => -1,
                'uniqueNames' => true,
                'tableName' => '',
                'table' => new InMemoryDataTable()
            ],
            [
                'typeName' => StandardNames::TYPE_RELATION,
                'typeTid' => -1,
                'uniqueNames' => true,
                'tableName' => '',
                'table' => new InMemoryDataTable()
            ],
            [
                'typeName' => StandardNames::TYPE_DATA_TYPE,
                'typeTid' => -1,
                'uniqueNames' => true,
                'tableName' => '',
                'table' => new InMemoryDataTable()
            ],

        ];



        $this->bootStrap();
    }

    public function getUniqueTid(): int
    {
       return Tid::generateUnique();
    }


    public function printInternalData() : void{
        print "System Person Tid\n   $this->systemTid\n";
        foreach($this->typesToTableSpec as $spec) {
            printf("Spec for type %s (tid %d)\n", $spec['typeName'], $spec['typeTid']);
            $this->printDataTable('', $spec['table']);
        }

        $this->printDataTable('Statements', $this->statementsTable);
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


    public function getEntityTidByTypeAndName(string|int $type, string $name) : int {
        if ($type === -1 || $type === '') {
            return -1;
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
    public function createEntity(string $type, string $name = '', string $description = '', int $createdBy = -1) : int {
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
        $this->makeRelationStatement($newTid, StandardNames::RELATION_IS_OF_TYPE, $typeTid, [], $createdBy, $creationTs );
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
    private function getTableForType(string|int $type) : DataTable {
        foreach($this->typesToTableSpec as $spec) {
            if ($spec['typeName'] === $type || $spec['typeTid'] === $type) {
                return $spec['table'];
            }
        }
        throw new InvalidTypeException();
    }

    /**
     * @throws InvalidTypeException
     * @throws InvalidNameException
     * @throws InvalidAttributeException
     * @throws InvalidRelationException
     */
    protected function bootStrap() : void {

        $this->systemTid = $this->getUniqueTid();
        $entityTypeTypeId = $this->getUniqueTid();
        $bootstrapTimestamp = time();

        $entityTypeTable = $this->getTableForType(StandardNames::TYPE_ENTITY_TYPE);

        $entityTypeTable->createRow([
                'tid' => $entityTypeTypeId,
                'name' => StandardNames::TYPE_ENTITY_TYPE,
                'description' => "EntityType:EntityType",
                'statementTid' => $this->getUniqueTid(),
                'editedBy' => $this->systemTid,
                'timestamp' => $bootstrapTimestamp,
                'statementNote' => 'Creating entity for the type EntityType',
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

        $this->typesToTableSpec[0]['typeTid'] = $entityTypeTypeId;

        // Create standard entity types
        $this->createEntity(StandardNames::TYPE_ENTITY_TYPE,
            StandardNames::TYPE_NO_TYPE, 'The type for entities without a type');
        $this->typesToTableSpec[1]['typeTid'] = $this->createEntity(StandardNames::TYPE_ENTITY_TYPE,
            StandardNames::TYPE_ATTRIBUTE, 'a predicate that has literal values as its object');
        $this->typesToTableSpec[2]['typeTid'] = $this->createEntity(StandardNames::TYPE_ENTITY_TYPE,
            StandardNames::TYPE_RELATION, 'a predicate that has entities as its object');
        $this->typesToTableSpec[3]['typeTid'] = $this->createEntity(StandardNames::TYPE_ENTITY_TYPE,
            StandardNames::TYPE_DATA_TYPE, 'e.g, integer, string, etc');
        $this->createEntity(StandardNames::TYPE_ENTITY_TYPE,
            StandardNames::TYPE_STATEMENT,  "a subject-predicate-object assertion done by a person in the system");
        $this->createEntity(StandardNames::TYPE_ENTITY_TYPE,
            StandardNames::TYPE_PERSON, 'Normally a human being');
        $this->createEntity(StandardNames::TYPE_ENTITY_TYPE,
            StandardNames::TYPE_PLACE, 'A geographical place');

        // Create standard attributes
        $this->createEntity(StandardNames::TYPE_ATTRIBUTE, StandardNames::ATTRIBUTE_NAME);
        $this->createEntity(StandardNames::TYPE_ATTRIBUTE, StandardNames::ATTRIBUTE_DESCRIPTION);
        $this->createEntity(StandardNames::TYPE_ATTRIBUTE, StandardNames::ATTRIBUTE_CREATED);
        $this->createEntity(StandardNames::TYPE_ATTRIBUTE, StandardNames::ATTRIBUTE_ALIAS);
        $this->createEntity(StandardNames::TYPE_ATTRIBUTE, StandardNames::ATTRIBUTE_TIMESTAMP);

        // Create standard relations
        $this->createEntity(StandardNames::TYPE_RELATION, StandardNames::RELATION_IS_OF_TYPE);
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

        // describe the system person
        $this->makeAttributeStatement($this->systemTid, StandardNames::ATTRIBUTE_CREATED,
            StandardNames::VALUE_TRUE, [], $this->systemTid, $bootstrapTimestamp);
        $this->makeRelationStatement($this->systemTid, StandardNames::RELATION_IS_OF_TYPE,
            $this->getEntityTidByTypeAndName('EntityType', 'Person'), [], $this->systemTid, $bootstrapTimestamp);
        $this->makeAttributeStatement($this->systemTid, StandardNames::ATTRIBUTE_NAME,
            'system', [], $this->systemTid, $bootstrapTimestamp);
        $this->makeAttributeStatement($this->systemTid, StandardNames::ATTRIBUTE_DESCRIPTION,
            'System Person', [], $this->systemTid, $bootstrapTimestamp);
    }


    public function makeAttributeStatement(int $subjectTid, string|int $attribute, string $value, array $qualifications,
                                           int $editedByPersonTid, string $statementNote = '', int $ts = -1): int
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
        $this->statementsTable->createRow([
            'tid' => $statementTid,
            'predicateType' => self::PREDICATE_ATTRIBUTE,
            'subject' => $subjectTid,
            'predicate' => $attributeTid,
            'object' => -1,
            'value' => $value,
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

        $this->statementsTable->createRow([
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

    public function mergeEntities(int $entityTid, int $intoEntityTid, int $mergedByPersonTid, int $ts = -1): int
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
        $rows = $this->statementsTable->findRows($findSpec);
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
                $data->relationsAsSubject[] = $statementData;
                if ($statementData->predicate === StandardNames::RELATION_IS_OF_TYPE) {
                    $data->type = $this->getEntityName($statementData->object, StandardNames::TYPE_ENTITY_TYPE);
                }
            }
        }
        $data->relationsAsObject = $this->findStatementsByObject($entityTid);

        if (count ($data->attributes) !== 0 || count($data->relationsAsObject) !== 0 || count($data->relationsAsSubject) !== 0) {
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
}