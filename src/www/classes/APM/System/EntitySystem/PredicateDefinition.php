<?php

namespace APM\System\EntitySystem;

class PredicateDefinition
{

    public int $tid = -1;
    public int $type = -1;

    public string $name = '';

    /**
     * List of strings allowed as values. If null, any value is allowed.
     *
     * Must be null if $isRelation is true
     * @var string[]|null
     */
    public ?array $allowedValues = null;

    /**
     * Flags that apply to the predicate
     * (defined in SystemPredicate)
     *
     * @var int[]|null
     */
    public ?array $flags = [];


    /**
     * List of entity types that are allowed as object, or ValueTypes
     * that are allowed as values.
     *
     * If null, any type is allowed.
     *
     * @var int[]|null
     */
    public ?array $allowedObjectTypes = null;


    /**
     * List of entity type that are allowed as subject.
     *
     * If null, any type is allowed.
     *
     * @var int[]|null
     */
    public ?array $allowedSubjectTypes = null;


    /**
     * If true and the predicate has a reverse, this predicate is the only one that must be
     * used in statements.
     *
     * Normally the relation that can be stated more than once for an entity should be the primary.
     * For example in the rChild / rParent pair, rChild should be primary so that all children
     * for a Person are statement with that person as subject.
     * @var bool
     */
    public bool $isPrimaryRelation = true;

    /**
     * Reverse predicate. E.g. for  rChild the reverse is rParent
     * @var int|null
     */
    public ?int $reversePredicate = null;

    public bool $canBeCancelled = true;


    public function isRelation() : bool {
        return $this->type === EntityType::Relation;
    }

    public function hasFlag(int $flagTid): bool {
        return in_array($flagTid, $this->flags);
    }

    public function isTypeAllowedAsObject(int $typeTid) : bool {
        if ($this->allowedObjectTypes === null) {
            return true;
        }
        return in_array($typeTid, $this->allowedObjectTypes);
    }

    public function isTypeAllowedAsSubject(int $typeTid) : bool {
        if ($this->allowedSubjectTypes === null) {
            return true;
        }
        return in_array($typeTid, $this->allowedSubjectTypes);
    }

    public function isValueAllowed(string $value) : bool {
        if ($this->allowedValues ===  null) {
            return true;
        }
        return in_array($value, $this->allowedValues);
    }
}