<?php

namespace APM\EntitySystem\Kernel;


use APM\EntitySystem\Schema\Entity;

class PredicateDefinition extends EntityDefinition
{

    /**
     * If true, only one object/value for this predicate is allowed for each entity.
     * For example, the predicate EntityName.
     *
     * @var bool
     */
    public bool $singleProperty = false;

    /**
     * List of strings allowed as values. If null, checking is deferred to
     * $allowedObjectTypes
     *
     * Must be null if $isRelation is true
     * @var string[]|null
     */
    public ?array $allowedValues = null;






    /**
     * Flags that apply to the predicate
     * (defined in the `PredicateFlag` class)
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
     * Reverse predicate. E.g. for  rChild the reverse is rParent
     * @var int|null
     */
    public ?int $reversePredicate = null;

    /**
     * If true and the predicate has a reverse, this predicate is the only one that must be
     * used in statements.
     *
     * Normally the relation that can be stated more than once for an entity should be the primary.
     * For example in the rChild / rParent pair, rChild should be primary so that all children
     * for a Person are statements with that person as subject. One possible exception is
     * geographical relations such as the pair rInsideOf / rContains, in which it seems more logical
     * to have rInsideOf as primary.
     *
     * @var bool
     */
    public bool $isPrimaryRelation = true;

    /**
     * If true, statement with this predicate can be cancelled, which is the norm.
     *
     * However, some predicates like EntityType should never be cancelled.
     * @var bool
     */
    public bool $canBeCancelled = true;




    public function isRelation() : bool {
        return $this->type === Entity::tRelation;
    }

    public function hasFlag(int $flagTid): bool {
        return in_array($flagTid, $this->flags);
    }

    public function isTypeAllowedAsObject(int $typeTid) : bool {
        if (in_array(PredicateFlag::QualificationPredicate, $this->flags)) {
            return false;
        }

        if (in_array(PredicateFlag::CancellationPredicate, $this->flags)) {
            return false;
        }
        if (in_array(PredicateFlag::StatementMetadata, $this->flags)) {
            return false;
        }
        if ($this->allowedObjectTypes === null) {
            return true;
        }
        return in_array($typeTid, $this->allowedObjectTypes);
    }

    public function isTypeAllowedAsSubject(int $typeTid) : bool {
        if (in_array(PredicateFlag::QualificationPredicate, $this->flags)) {
            return false;
        }

        if (in_array(PredicateFlag::CancellationPredicate, $this->flags)) {
            return false;
        }
        if (in_array(PredicateFlag::StatementMetadata, $this->flags)) {
            return false;
        }
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