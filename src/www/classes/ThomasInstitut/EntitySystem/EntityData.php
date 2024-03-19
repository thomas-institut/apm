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
            if ($statement->predicate === $predicate) {
                return $statement->object;
            }
        }
        return null;
    }

    public function getAllObjectsForPredicate(int $predicate) : array {
        $objects = [];
        foreach($this->statements as $statement) {
            if ($statement->predicate === $predicate) {
                $objects[] =  $statement->object;
            }
        }
        return $objects;
    }

}