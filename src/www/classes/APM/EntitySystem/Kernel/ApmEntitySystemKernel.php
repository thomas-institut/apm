<?php

namespace APM\EntitySystem\Kernel;

use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Exception\InvalidObjectException;
use APM\EntitySystem\Exception\InvalidPredicateException;
use APM\EntitySystem\Exception\InvalidStatementException;
use APM\EntitySystem\Exception\InvalidSubjectException;
use APM\EntitySystem\Exception\InvalidValueException;
use APM\EntitySystem\Schema\AreaTypes;
use APM\EntitySystem\Schema\BibPredicates;
use APM\EntitySystem\Schema\Calendars;
use APM\EntitySystem\Schema\DocumentPredicates;
use APM\EntitySystem\Schema\DocumentTypes;
use APM\EntitySystem\Schema\ImageSources;
use APM\EntitySystem\Schema\LegacyDatabaseIdPredicates;
use APM\EntitySystem\Schema\Entity;
use APM\EntitySystem\Schema\EntityTypes;
use APM\EntitySystem\Schema\GeoPredicates;
use APM\EntitySystem\Schema\IdTypes;
use APM\EntitySystem\Schema\Languages;
use APM\EntitySystem\Schema\Materials;
use APM\EntitySystem\Schema\OrganizationTypes;
use APM\EntitySystem\Schema\PageTypes;
use APM\EntitySystem\Schema\PersonPredicates;
use APM\EntitySystem\Schema\SystemEntity;
use APM\EntitySystem\Schema\SystemPredicates;
use APM\EntitySystem\Schema\UrlTypes;
use APM\EntitySystem\Schema\ValueTypes;
use APM\EntitySystem\Schema\EditionSourcePredicates;
use APM\EntitySystem\Schema\WorkPredicates;
use InvalidArgumentException;
use LogicException;
use ThomasInstitut\EntitySystem\EntityData;
use ThomasInstitut\EntitySystem\StatementData;

/**
 * The heart of the Apm entity system
 *
 * Manages all system entities, types, value types and predicates
 *
 *
 */
class ApmEntitySystemKernel
{

    const MaxSystemTid = 10000000;

    const SystemCreationTimestamp = 1;

    /**
     * @var PredicateDefinition[]
     */
    private array $predicates;
    /**
     * @var EntityTypeDefinition[]
     */
    private array $entityTypes;

    /**
     * @var ValueTypeValidator[]
     */
    private array $valueTypeValidators;

    /**
     * @var EntityDefinition[]
     */
    private array $valueTypes;


    /**
     * @var EntityDefinition[]
     */
    private array $otherEntities;


    /**
     * @var int[]
     */
    private array $qualificationPredicates;


    private array $validQualificationObjects;
    private array $systemStatements;


    public function __construct()
    {
        $typeDefiners = [
            new EntityTypes()
        ];

        $predicateDefiners = [
            new SystemPredicates(),
            new PersonPredicates(),
            new WorkPredicates(),
            new EditionSourcePredicates(),
            new GeoPredicates(),
            new LegacyDatabaseIdPredicates(),
            new DocumentPredicates(),
            new BibPredicates()
        ];

        $valueTypeDefiners = [
            new ValueTypes()
        ];

        $otherEntityDefiners = [
            new SystemEntity(),
            new IdTypes(),
            new OrganizationTypes(),
            new UrlTypes(),
            new Languages(),
            new Materials(),
            new AreaTypes(),
            new Calendars(),
            new DocumentTypes(),
            new ImageSources(),
            new PageTypes()
        ];

        /** @var $allDefiners EntityDefiner[]*/
        $allDefiners = [ ...$typeDefiners, ...$predicateDefiners, ...$valueTypeDefiners, ...$otherEntityDefiners ];

        $this->entityTypes = [];
        foreach($typeDefiners as $definer) {
            foreach($definer->getEntityTypeDefinitions() as $entityTypeDefinition) {
                $tid = $entityTypeDefinition->id;
                if (isset($this->entityTypes[$tid])) {
                    throw new LogicException("Type $tid is defined twice: " . get_class($definer));
                }
                $this->entityTypes[$tid] = $entityTypeDefinition;
            }
        }

        $this->predicates = [];
        foreach ($predicateDefiners as $predicateDefiner) {
            foreach($predicateDefiner->getPredicateDefinitions() as $predicateDefinition) {
                $tid = $predicateDefinition->id;
                if (isset($this->predicates[$tid])) {
                    throw new LogicException("Predicate $tid is defined twice: " . get_class($predicateDefiner));
                }
                $this->predicates[$tid] = $predicateDefinition;
            }
        }

        foreach($valueTypeDefiners as $valueTypeDefiner) {
            foreach($valueTypeDefiner->getEntityDefinitions() as $entityDefinition) {
                $tid = $entityDefinition->id;
                if (isset($this->valueTypes[$tid])) {
                    throw new LogicException("Value type $tid is defined twice");
                }
                $this->valueTypes[$tid] = $entityDefinition;
            }
        }

        $this->valueTypeValidators = [];
        foreach(array_keys($this->valueTypes) as $tid) {
            $this->valueTypeValidators[$tid] = null;
            foreach($valueTypeDefiners as $valueTypeDefiner) {
                $validator = $valueTypeDefiner->getValueTypeValidator($tid);
                if ($validator !== null) {
                    $this->valueTypeValidators[$tid] = $validator;
                    break;
                }
            }
        }
        foreach ($this->valueTypeValidators as $tid => $validator) {
            if ($validator === null) {
                throw new LogicException("No validator defined for value type $tid");
            }
        }

        $this->otherEntities = [];
        foreach ($otherEntityDefiners as $entityDefiner) {
            foreach($entityDefiner->getEntityDefinitions() as $entityDefinition) {
                $tid = $entityDefinition->id;
                if (isset($this->otherEntities[$tid])) {
                    throw new LogicException("Entity $tid is defined twice");
                }
                $this->otherEntities[$tid] = $entityDefinition;
            }
        }

        $systemTids = Entity::getDefinedTids();
        $systemTidMap = [];
        foreach($systemTids as $tid) {
            $systemTidMap[$tid] = 0;
        }

        $allDefinedEntities = [];
        array_push($allDefinedEntities, ...$this->entityTypes);
        array_push($allDefinedEntities, ...$this->predicates);
        array_push($allDefinedEntities, ...$this->valueTypes);
        array_push($allDefinedEntities, ...$this->otherEntities);

        foreach($allDefinedEntities as $entityDefinition) {
            $tid = $entityDefinition->id;
            if (!isset($systemTidMap[$tid])) {
                throw new LogicException("Defined entity $tid not part of general system entity list");
            }
            $systemTidMap[$tid]++;
        }
        foreach($systemTidMap as $tid => $definitionCount) {
            if ($definitionCount === 0) {
                throw new LogicException("No definition found for system entity $tid");
            }
            if ($definitionCount > 1) {
                throw new LogicException("System entity $tid is defined $definitionCount times");
            }
        }

        $this->qualificationPredicates = $this->calcQualificationPredicates();

        $this->validQualificationObjects = [];
        $validQualificationObjectTypes = [];
        foreach ($this->qualificationPredicates as $qualificationPredicate) {
            $predicateDef = $this->predicates[$qualificationPredicate];
            array_push($validQualificationObjectTypes, ...($predicateDef->allowedObjectTypes ?? []));
        }
        $validQualificationObjectTypes = array_unique($validQualificationObjectTypes);
        foreach ($validQualificationObjectTypes as $type) {
            array_push($this->validQualificationObjects, ...($this->getAllEntitiesForType($type) ?? []));
        }
        $this->validQualificationObjects = array_unique($this->validQualificationObjects);
        sort($this->validQualificationObjects, SORT_NUMERIC);

        $this->systemStatements = [];
        foreach ($allDefiners as $definer) {
            array_push($this->systemStatements, ...$definer->getStatements());
        }
        // check statement consistency
        foreach ($this->systemStatements as $triplet) {
            [ $subject, $predicate, $object] = $triplet;
            if (gettype($subject) !== 'integer') {
                throw new LogicException("Subject in system statement not an Entity Id: $subject");
            }
            if (!$this->entityExistsInEntityDefArray($allDefinedEntities, $subject)) {
                throw new LogicException("Subject in system statement is not defined: [ $subject, $predicate, $object ]");
            }
            if (gettype($predicate) !== 'integer') {
                throw new LogicException("Subject in system statement not an Entity Id: [ $subject, $predicate, $object ]");
            }
            if (!isset($this->predicates[$predicate])) {
                throw new LogicException("Predicate in system statement not valid: [ $subject, $predicate, $object ]");
            }
            if (gettype($object) === 'integer' && !$this->entityExistsInEntityDefArray($allDefinedEntities, $object )) {
                throw new LogicException("Subject in system statement not an Entity Id: [ $subject, $predicate, $object ]");
            }
        }
    }


    /**
     * Returns the definition of the given predicate.
     *
     * @param int $predicate
     * @return PredicateDefinition
     * @throws EntityDoesNotExistException
     */
    public function getPredicateDefinition(int $predicate): PredicateDefinition {
        if (isset($this->predicates[$predicate])) {
            return $this->predicates[$predicate];
        }
        throw new EntityDoesNotExistException();
    }

    /**
     * @throws EntityDoesNotExistException
     */
    public function getEntityData(int $entity): EntityData {

        try {
            return $this->getEntityDataFromEntityArray($this->entityTypes, $entity, function ($def){
                return $this->genEntityDataForEntityType($def);
            });
        } catch (EntityDoesNotExistException) {
        }

        try {
            return $this->getEntityDataFromEntityArray($this->predicates, $entity, function ($def){
                return $this->genEntityDataForPredicate($def);
            });
        } catch (EntityDoesNotExistException) {
        }

        try {
            return $this->getEntityDataFromEntityArray($this->valueTypes, $entity, function ($def){
                return $this->genEntityDataForValueType($def);
            });
        } catch (EntityDoesNotExistException) {
        }

        try {
            return $this->getEntityDataFromEntityArray($this->otherEntities, $entity, function ($def){
                return $this->genEntityDataForOtherEntity($def);
            });
        } catch (EntityDoesNotExistException) {
        }

        throw  new EntityDoesNotExistException();
    }


    private function genEntityDataFromEntityDefinition(EntityDefinition $def) : EntityData {
        // Basic data from definition
        $data = new EntityData();
        $data->type = $def->type;
        $data->name = $def->name;
        $data->id = $def->id;

        // system statements
        $statementTriplets = [];
        $statementAsObjectTriplets = [];
        foreach ($this->systemStatements as $statementTriplet) {
            if ($statementTriplet[0] === $data->id) {
                $statementTriplets[] = $statementTriplet;
                continue;
            }
            if ($statementTriplet[2] === $def->id) {
                $statementAsObjectTriplets[] = $statementTriplet;
            }

        }
        foreach ($statementTriplets as $triplet) {
            $data->statements[] = $this->getStatementFromSystemStatementTriplet($triplet);
        }

        foreach ($statementAsObjectTriplets as $statementAsObjectTriplet) {
            $data->statementsAsObject[] = $this->getStatementFromSystemStatementTriplet($statementAsObjectTriplet);
        }
        return $data;
    }

    private function getStatementFromSystemStatementTriplet(array $triplet) : StatementData {
        $statement = new StatementData();

        [ $subject, $predicate, $object] = $triplet;

        $statement->subject = $subject;
        $statement->predicate = $predicate;
        $statement->object = $object;
        $statement->statementMetadata = [
            [ Entity::pStatementAuthor, Entity::System],
            [ Entity::pStatementTimestamp, self::SystemCreationTimestamp],
            [ Entity::pStatementEditorialNote, 'System statement']
        ];
        return $statement;
    }

    private function genEntityDataForEntityType(EntityTypeDefinition $def) : EntityData {
        return $this->genEntityDataFromEntityDefinition($def);
    }

    private function genEntityDataForPredicate(PredicateDefinition $def) : EntityData {
        return $this->genEntityDataFromEntityDefinition($def);
    }

    private function genEntityDataForValueType(EntityTypeDefinition $def) : EntityData {
        return $this->genEntityDataFromEntityDefinition($def);
    }

    private function genEntityDataForOtherEntity(EntityDefinition $def) : EntityData {
        return $this->genEntityDataFromEntityDefinition($def);
    }

    private function entityExistsInEntityDefArray(array $entityDefArray, int $entity) : bool {
        for($i = 0; $i < count($entityDefArray); $i++) {
            if ($entity === $entityDefArray[$i]->id) {
                return true;
            }
        }
        return false;
    }

    public function getStatements(?int $subject, ?int $predicate, int|string|null $object) : array{
        $statementDataArray = [];
        foreach ($this->systemStatements as $statementTriplet) {
            [ $stSubject, $stPredicate, $stObject] = $statementTriplet;

            if ($subject !== null && $subject !== $stSubject) {
                continue;
            }
            if ($predicate !== null && $predicate !== $stPredicate) {
                continue;
            }
            if ($object !== null && $object !== $stObject) {
                continue;
            }

            $statement = new StatementData();

            $statement->subject = $stSubject;
            $statement->predicate = $stPredicate;
            $statement->object = $stObject;
            $statement->statementMetadata = [];
            $statementDataArray[] = $statement;
        }

        return $statementDataArray;


    }



    /**
     * @param EntityDefinition[] $entityDefArray
     * @param int $entity
     * @param callable $generator
     * @return EntityData
     * @throws EntityDoesNotExistException
     */

    private function getEntityDataFromEntityArray(array $entityDefArray, int $entity, callable $generator) : EntityData {
        foreach($entityDefArray as $entityDef) {
            if ($entityDef->id === $entity) {
                return call_user_func($generator, $entityDef);
            }
        }
        throw new EntityDoesNotExistException();
    }

    public function predicateCanBeCancelled($tid): bool {
        return $this->isValidPredicate($tid) && $this->predicates[$tid]->canBeCancelled;
    }

    public function isValidPredicate(int $tid): bool {
        return isset($this->predicates[$tid]);
    }

    public function isValidEntityType(int $tid) : bool {
        return isset($this->entityTypes[$tid]);
    }

    public function entityCreationAllowedForType(int $tid) : bool {
        return $this->isValidEntityType($tid) && !$this->entityTypes[$tid]->isSystemType;
    }

    public function isSystemType(int $type) : bool {
        return $this->isValidEntityType($type) && $this->entityTypes[$type]->isSystemType;
    }

    /**
     * Returns all entities for the given type or null if the type is not a system type
     * @param int $type
     * @return array|null
     */
    public function getAllEntitiesForType(int $type) : array|null {
        if (!$this->isSystemType($type)) {
            return null;
        }
        switch($type) {
            case Entity::tEntityType:
                return array_keys($this->entityTypes);

            case Entity::tValueType:
                return array_keys($this->valueTypes);


            case Entity::tStatement:
            case Entity::tStatementGroup:
                return null;

            default:
                $tids = [];
                foreach($this->otherEntities as $tid => $def) {
                    if ($def->type === $type) {
                        $tids[] = $tid;
                    }
                }
                return $tids;
        }
    }

    /**
     * Returns an array entity data for all valid qualification objects (languages, id types, url types, etc.)
     *
     * @return EntityData[]
     */
    public function getValidQualificationObjects() : array {
        return $this->validQualificationObjects;
    }

    /**
     * Checks that everything is correct with the given statement.
     *
     * Throws StatementValidation exceptions for the different problems
     * @param int $subject
     * @param int $subjectType
     * @param int $predicate
     * @param string|int $object
     * @param int|null $objectType
     * @param array $statementMetadata
     * @return void
     * @throws InvalidPredicateException
     * @throws InvalidStatementException
     * @throws InvalidSubjectException
     */
    public function validateStatement(int $subject, int $subjectType, int $predicate,
                                      string|int $object, ?int $objectType, array $statementMetadata) : void {

        if ($this->isSystemEntity($subject)) {
            throw new InvalidSubjectException("System entities are not allowed as subjects");
        }
        if (!$this->isValidPredicate($predicate)) {
            throw new InvalidPredicateException("Predicate $predicate not defined");
        }

        $predicateDef = $this->predicates[$predicate];
        $this->validatePredicate($predicate, $predicateDef, $subjectType, $object, $objectType);
        $this->validateMetadata($statementMetadata, PredicateFlag::StatementMetadata);
    }


    public function isSystemEntity(int $tid) : bool {
        return $tid <= self::MaxSystemTid;
    }

    /**
     * @throws InvalidStatementException
     */
    public function validateMetadata(array $metadata, int $flag) : void {
        foreach($metadata as $metadatum) {
            [ $metadataPredicate, $metadataObject] = $metadatum;

            if (!$this->isValidPredicate($metadataPredicate)) {
                throw new InvalidPredicateException("Predicate $metadataPredicate not defined");
            }

            $def = $this->predicates[$metadataPredicate];

            if (!$def->hasFlag($flag)) {
                throw new InvalidPredicateException("Predicate $metadataPredicate cannot be used as statement metadata");
            }
            $this->validatePredicate($metadataPredicate, $def, null, $metadataObject, null);
        }
    }


    public function isPredicateSingleProperty(int $predicate) : bool {
        $predicateDef = $this->predicates[$predicate];

        return $predicateDef->singleProperty;
    }

    /**
     * @param int $predicate
     * @param PredicateDefinition $predicateDef
     * @param int|null $subjectType
     * @param string|int $object
     * @param int|null $objectType
     * @return void
     * @throws InvalidStatementException
     */
    private function validatePredicate(int $predicate, PredicateDefinition $predicateDef, ?int $subjectType, string|int $object, ?int $objectType) : void {
        $predicateFullName = "$predicateDef->name ($predicate)";
        if ($subjectType !==null && !$predicateDef->isTypeAllowedAsSubject($subjectType)) {
            throw new InvalidSubjectException("Subject type for relation $predicateFullName must be one of: " .
                implode(', ', $predicateDef->allowedSubjectTypes));
        }
        if ($predicateDef->isRelation()) {
            if (!is_int($object)) {
                throw new InvalidObjectException("Object for relation $predicateFullName must be an entity id");
            }
            if (!$predicateDef->isPrimaryRelation) {
                throw new InvalidPredicateException("Trying to use a reverse relation as predicate");
            }

            if ($objectType!== null && !$predicateDef->isTypeAllowedAsObject($objectType)) {
                throw new InvalidObjectException("Object type for relation $predicateFullName must be one of: " .
                    implode(', ', $predicateDef->allowedObjectTypes));
            }
        } else {
            if (!is_string($object)) {
                throw new InvalidObjectException("Object for attribute $predicateFullName must be a string");
            }

            if (!$predicateDef->isValueAllowed($object)) {
                throw new InvalidValueException("Value '$object' not in list of allowed values for attribute $predicateFullName");
            }

            if ($predicateDef->allowedObjectTypes !== null) {
                $valueAllowed = false;
                foreach($predicateDef->allowedObjectTypes as $valueType) {
                    if ($this->valueTypeValidators[$valueType]->stringIsValid($object)){
                        $valueAllowed = true;
                        break;
                    }
                }
                if (!$valueAllowed) {
                    throw new InvalidValueException("Value '$object' is not of one of the allowed value types for attribute $predicateFullName");
                }
            }
        }
    }


    /**
     * Returns a list of predicates that allow the given type as subject in a statement
     *
     * @param int $type
     * @param bool $includeReverseRelations
     * @return int[]
     */
    public function getValidPredicatesAsSubjectForType(int $type, bool $includeReverseRelations = false) : array {
        if (!isset($this->entityTypes[$type])) {
            throw new InvalidArgumentException("Entity $type is not a type");
        }

        $typeDef = $this->entityTypes[$type];
        if ($typeDef->isSystemType) {
            return [];
        }
        $validPredicates = [];
        foreach($this->predicates as $predicateDef) {
            if ($predicateDef->isTypeAllowedAsSubject($type)) {
                if ($predicateDef->isRelation()) {
                    if ($predicateDef->isPrimaryRelation || $includeReverseRelations) {
                        $validPredicates[] = $predicateDef->id;
                    }
                } else {
                    $validPredicates[] = $predicateDef->id;
                }
            }
        }
        return $validPredicates;
    }



    private function calcQualificationPredicates() : array {
        $predicates = [];
        foreach($this->predicates as $predicateDef) {
            if ($predicateDef->hasFlag(PredicateFlag::QualificationPredicate)) {
                $predicates[] = $predicateDef->id;
            }
        }
        return $predicates;
    }
    /**
     * Gets the list of all predicates that can be used as statement qualifications
     * @return int[]
     */
    public function getValidQualificationPredicates() : array
    {
       return $this->qualificationPredicates;
    }


    /**
     * Returns a list of predicates that allow the given type as subject in a statement
     *
     * @param int $type
     * @param bool $includeReverseRelations
     * @return int[]
     */
    public function getValidPredicatesAsObjectForType(int $type, bool $includeReverseRelations = false) : array{
        if (!isset($this->entityTypes[$type])) {
            throw new InvalidArgumentException("Entity $type is not a type");
        }

        $typeDef = $this->entityTypes[$type];
        if ($typeDef->isSystemType) {
            return [];
        }
        $validPredicates = [];
        foreach($this->predicates as $predicateDef) {

            if ($predicateDef->isRelation() && $predicateDef->isTypeAllowedAsObject($type)) {
                if ($predicateDef->isPrimaryRelation || $includeReverseRelations) {
                    $validPredicates[] = $predicateDef->id;
                }
            }
        }
        return $validPredicates;
    }
}