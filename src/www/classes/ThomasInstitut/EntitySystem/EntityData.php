<?php

namespace ThomasInstitut\EntitySystem;

use ThomasInstitut\Exportable\Exportable;
use ThomasInstitut\Exportable\ExportableObject;

class EntityData implements Exportable
{
    public int $tid = -1;
    /**
     * @var StatementData[]
     */
    public array $statements = [];
    /**
     * @var StatementData[]
     */
    public array $statementsAsObject = [];


    public function getExportObject(): array
    {
        $exportObject = get_object_vars($this);
        $exportObject['className'] = ExportClasses::ENTITY_DATA;
        $exportObject['statements'] = ExportableObject::getArrayExportObject($this->statements);
        $exportObject['statementsAsObject']  = ExportableObject::getArrayExportObject($this->statementsAsObject);
        return $exportObject;
    }

    /**
     * Returns the object tid or the string value of the first statement in the
     * entity's statements in which the subject is the entity, the predicate
     * is the given predicate and the statement is not qualified.
     *
     * If there's no such statement, returns null.
     *
     * Returns
     * @param int $predicateTid
     * @return string|int|null
     */
    public function getUnqualifiedObjectForPredicate(int $predicateTid) : string|int|null {
        foreach ($this->statements as $statement) {
            if (!$statement->isCancelled && $statement->predicate === $predicateTid && count($statement->qualifications) === 0) {
                return $statement->object === -1 ? $statement->value : $statement->object;
            }
        }
        return null;
    }

    /**
     * @param int $predicateTid
     * @param bool $includeStatementsAsObject
     * @param bool $includeCancelled
     * @return StatementData[]
     */
    public function getPredicateStatements(int $predicateTid, bool $includeStatementsAsObject = false, bool $includeCancelled = false) : array {
        $statements = [];
        foreach ($this->statements as $statement) {
            if ( ($includeCancelled || !$statement->isCancelled) && $statement->predicate === $predicateTid) {
                $statements[] = $statement;
            }
        }
        if ($includeStatementsAsObject) {
            foreach ($this->statementsAsObject as $statement) {
                if ( ($includeCancelled || !$statement->isCancelled) && $statement->predicate === $predicateTid) {
                    $statements[] = $statement;
                }
            }
        }
        return $statements;
    }

    /**
     * Returns the value of the first non-cancelled statement for the given attribute or
     * null if the attribute is not set
     *
     * @param int $attributeTid
     * @return string|null
     */
    public function getFirstAttributeValue(int $attributeTid) : string|null {
        $statements = $this->getPredicateStatements($attributeTid);
        if (count($statements) === 0) {
            return null;
        }
        return $statements[0]->value;
    }

}