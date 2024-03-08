<?php

namespace APM\System\EntitySystem;

use LogicException;

/**
 * The heart of the Apm EntitySystem
 *
 * Defines all system entities, types, value types and predicates
 */
class ApmEntitySystemKernel
{

    const MaxSystemTid = 100000;

    /**
     * @var PredicateDefinition[]
     */
    private array $predicateDefinitions;
    /**
     * @var array
     */
    private array $definedTypes;

    /**
     * @var ValueTypeValidator[]
     */
    private array $valueTypeValidators;
    /**
     * @var EntityTypeDefinition[]
     */
    private array $entityTypeDefinitions;


    public function __construct()
    {

        /**
         * @var PredicateDefiner[] $predicateDefiners
         */
        $predicateDefiners = [];

        $predicateDefiners[] = new SystemPredicate();
        $predicateDefiners[] = new GeoPredicate();
        $predicateDefiners[] = new PersonPredicate();

        $this->predicateDefinitions = [];
        foreach($predicateDefiners as $definer) {
            $tids = $definer::getDefinedTids();
            foreach($tids as $name => $tid) {
                $def = $definer->getPredicateDefinition($tid);
                $def->name = $name;
                $this->predicateDefinitions[$tid]  = $def;
            }
        }

        $this->entityTypeDefinitions = [];
        foreach(EntityType::getDefinedTids() as $tid) {
            $this->entityTypeDefinitions[$tid] = EntityType::getEntityTypeDefinition($tid);
        }


        $this->valueTypeValidators = [];
        foreach(ValueType::getDefinedTids() as $tid) {
            $this->valueTypeValidators[$tid] = ValueType::getValueTypeValidator($tid);
        }

        $systemTids = [
            ...array_keys($this->predicateDefinitions),
            ...array_keys($this->entityTypeDefinitions),
            ...array_keys($this->valueTypeValidators)
        ];

        $value_counts = array_count_values($systemTids);
        foreach($value_counts as $tid => $count) {
            if ($count > 1) {
                throw new LogicException("System tid $tid is defined $count times");
            }
        }
    }

    public function predicateCanBeCancelled($tid): bool {
        return $this->isValidPredicate($tid) && $this->predicateDefinitions[$tid]->canBeCancelled;
    }

    public function isValidPredicate(int $tid): bool {
        return isset($this->predicateDefinitions[$tid]);
    }

    public function isValidEntityType(int $tid) : bool {
        return isset($this->entityTypeDefinitions[$tid]);
    }

    public function entityCreationAllowedForType(int $tid) : bool {
        return $this->isValidEntityType($tid) && $this->entityTypeDefinitions[$tid]->entityCreationAllowed;
    }

    public function entitiesCanBeQueriedForType(int $type) : bool {
        return $this->isValidEntityType($type) && $this->entityTypeDefinitions[$type]->entitiesCanBeQueried;
    }

    /**
     * Checks that everything is correct with the given statement.
     *
     * Throws StatementValidation exceptions for the different problems
     * @param int $subject
     * @param int $subjectType
     * @param int $predicate
     * @param string|int $object
     * @param int $objectType
     * @param array $statementMetadata
     * @return void
     * @throws InvalidStatementException
     */
    public function validateStatement(int $subject, int $subjectType, int $predicate,
                                      string|int $object, int $objectType, array $statementMetadata) : void {

        if ($this->isSystemEntity($subject)) {
            throw new InvalidSubjectException("System entities are not allowed as subjects");
        }
        if (!$this->isValidPredicate($predicate)) {
            throw new InvalidPredicateException("Predicate $predicate not defined");
        }

        $predicateDef = $this->predicateDefinitions[$predicate];
        $this->validatePredicate($predicate, $predicateDef, $subjectType, $object, $objectType);
        $this->validateMetadata($statementMetadata, SystemPredicate::IsStatementMetadataPredicate);
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

            $def = $this->predicateDefinitions[$metadataPredicate];

            if (!$def->hasFlag($flag)) {
                throw new InvalidPredicateException("Predicate $metadataPredicate cannot be used as statement metadata");
            }
            $this->validatePredicate($metadataPredicate, $def, null, $metadataObject, null);
        }
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
}