<?php

namespace ThomasInstitut\EntitySystem;

use ThomasInstitut\Exportable\Exportable;
use ThomasInstitut\Exportable\ExportableObject;

class EntityData
{
    public int $id = -1;
    /**
     * @var StatementData[]
     */
    public array $statements = [];
    /**
     * @var StatementData[]
     */
    public array $statementsAsObject = [];


    /**
     * Null is the entity is not merged.
     *
     * If the entity is merged, the currently non-merged entity into which this entity resolves.
     * This may not be the same as the entity into which this entity was merged into originally.
     * If A was merged into B, and later B was merged into C, the value here is C, not B.
     * The original mergeInto entity can found as the object of the predicate MergedInto in the statements.
     *
     * @var int|null
     */
    public ?int $mergedInto = null;


    /**
     * Returns the object of the first encountered
     * statement with the entity as subject and the given predicate.
     *
     * Returns null if no such statement is found.
     *
     * @param int $predicate
     * @return int|string|null
     */
    public function getObjectForPredicate(int $predicate) : int|string|null {
        foreach($this->statements as $statement) {
            if ($statement->predicate === $predicate && !$statement->isCancelled()) {
                return $statement->object;
            }
        }
        return null;
    }

    public function getAllObjectsForPredicate(int $predicate) : array {
        $objects = [];
        foreach($this->statements as $statement) {
            if ($statement->predicate === $predicate && !$statement->isCancelled()) {
                $objects[] =  $statement->object;
            }
        }
        return $objects;
    }

    public function isMerged() : bool {
        return $this->mergedInto !== null;
    }

}