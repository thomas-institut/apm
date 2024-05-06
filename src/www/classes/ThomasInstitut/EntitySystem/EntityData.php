<?php

namespace ThomasInstitut\EntitySystem;

use ThomasInstitut\Exportable\Exportable;
use ThomasInstitut\Exportable\ExportableObject;

class EntityData
{
    /**
     * Entity id
     * @var int
     */
    public int $id = -1;


    /**
     * The entity's type
     * @var int
     */
    public int $type = -1;

    /**
     * The entity's name)
     * @var string
     */
    public string $name = '';
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
     * Returns the first statement with the given predicate, and, optionally,
     * with the given qualification predicate and qualification object/value
     *
     * @param int $predicate
     * @param int|null $qualificationPredicate
     * @param string|int|null $qualification
     * @return StatementData|null
     */
    public function getStatementForPredicate(int $predicate, int $qualificationPredicate = null, string|int|null $qualification = null) : StatementData|null {
        foreach($this->statements as $statement) {
            if ($statement->predicate === $predicate && !$statement->isCancelled()) {
                if ($qualificationPredicate !== null) {
                    foreach ($statement->statementMetadata as $statementMetadatum) {
                        [ $pred, $obj ] = $statementMetadatum;
                        if ($pred === $qualificationPredicate) {
                            if ($qualification === null || $qualification === $obj) {
                                return $statement;
                            }
                        }
                    }
                } else {
                    return $statement;
                }

            }
        }
        return null;

    }


    /**
     * Returns the object of the first encountered
     * statement with the entity as subject and the given predicate.
     *
     * Optionally, matches only objects in statements with the given qualification predicate
     * and qualification object/value.
     *
     * Returns null if no such statement is found.
     *
     * @param int $predicate
     * @param int|null $qualificationPredicate
     * @param string|int|null $qualification
     * @return int|string|null
     */
    public function getObjectForPredicate(int $predicate, int|null $qualificationPredicate = null, string|int|null $qualification = null) : int|string|null {
        $statement = $this->getStatementForPredicate($predicate, $qualificationPredicate, $qualification);
        return $statement?->object;
    }


    /**
     * Returns the all statements with the given predicate, and, optionally,
     * also with the given qualification predicate and qualification object/value
     *
     * @param int $predicate
     * @param int|null $qualificationPredicate
     * @param string|int|null $qualification
     * @return StatementData[]
     */
    public function getAllStatementsForPredicate(int $predicate, int|null $qualificationPredicate = null,string|int|null $qualification = null ) : array {
        $statements = [];
        foreach($this->statements as $statement) {
            if ($statement->predicate === $predicate && !$statement->isCancelled()) {
                if ($qualificationPredicate !== null) {
                    foreach ($statement->statementMetadata as $statementMetadatum) {
                        [ $pred, $obj ] = $statementMetadatum;
                        if ($pred === $qualificationPredicate) {
                            if ($qualification === null || $qualification === $obj) {
                                $statements[] = $statement;
                            }
                        }
                    }
                } else {
                    $statements[] = $statement;
                }

            }
        }
        return $statements;
    }

    /**
     * @param int $predicate
     * @param int|null $qualificationPredicate
     * @param string|int|null $qualification
     * @return int[]|string[]
     */
    public function getAllObjectsForPredicate(int $predicate, int|null $qualificationPredicate = null,string|int|null $qualification = null ): array {
        $objects = [];
        foreach($this->getAllStatementsForPredicate($predicate, $qualificationPredicate, $qualification) as $statement) {
            $objects[] =  $statement->object;
        }
        return $objects;
    }

    /**
     * Returns all objects for statements of the given predicate, grouped by the values of the qualification predicate.
     *
     * Statements where the qualification predicate is not set are grouped under the given $noQualificationKey
     *
     *  [  qualificationPredicateValue1 => [ obj1, obj2, ... ],
     *     qualificationPredicateValue2 => [ obj1, obj2, ...],
     *
     *     noQualificationKey => [ obj1, obj2, ... ]
     *
     * @param int $
     * @param int $qualificationPredicate
     * @param string $noQualificationKey
     * @return array
     */
    public function getAllObjectsForPredicateByQualificationPredicate(int $predicate, int $qualificationPredicate, string $noQualificationKey) : array {

        $returnArray = [ ];
        $statements = $this->getAllStatementsForPredicate($predicate);
        foreach($statements as $statement) {
            $key = $noQualificationKey;
            foreach($statement->statementMetadata as $metadatum) {
                [ $metadataPredicate, $qualificationObject ] = $metadatum;
                if ($metadataPredicate === $qualificationPredicate) {
                   $key = $qualificationObject;
                   break;
                }
            }
            if (!isset($returnArray[$key])) {
                $returnArray[$key] = [];
            }
            $returnArray[$key][] = $statement->object;
        }
        return $returnArray;
    }



    public function isMerged() : bool {
        return $this->mergedInto !== null;
    }

}