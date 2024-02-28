<?php

namespace ThomasInstitut\EntitySystem;

use InvalidArgumentException;
use RuntimeException;
use ThomasInstitut\DataTable\DataTable;
use ThomasInstitut\DataTable\InvalidRowForUpdate;
use ThomasInstitut\DataTable\RowAlreadyExists;

/**
 * A minimal entity system with DataTable storage.
 *
 */
class MultiDataTableMinimalEntitySystem implements MinimalEntitySystem
{
    
    const StatementIdCol = 'statementId';
    const SubjectCol = 'subject';
    const PredicateCol = 'predicate';
    const ObjectCol = 'object';
    const ValueCol = 'value';
    const CancellationIdCol = 'cancellationId';

    private string $statementIdCol;
    private string $subjectCol;
    private string $predicateCol;
    private string $objectCol;
    private string $valueCol;
    private string $cancellationIdCol;
    /**
     * @var DataTable[]
     */
    private array $dataTableArray;

    /**
     * Constructs an entity system instance that stores statements in a set of
     * DataTables.
     *
     * Each DataTable must have the following columns/fields:
     *  * id: int
     *  * statementId: int
     *  * subject: int
     *  * predicate: int
     *  * objectId: int|null
     *  * value: string|null
     *  * cancellationId: int|null
     *
     * By default, the first table is used for all statements.
     *
     * @param DataTable[] $dataTableArray
     * @param array $columnNames
     */
    public function __construct(array $dataTableArray, array $columnNames = [])
    {
        $this->dataTableArray = $dataTableArray;

        if (count($dataTableArray) === 0) {
            throw new InvalidArgumentException("No Datatables given");
        }

        $this->statementIdCol = self::StatementIdCol;
        $this->subjectCol = self::SubjectCol;
        $this->predicateCol = self::PredicateCol;
        $this->objectCol = self::ObjectCol;
        $this->valueCol = self::ValueCol;
        $this->cancellationIdCol = self::CancellationIdCol;
        
        $this->setColumnNamesFromArray($columnNames);
        
    }

    
    private function setColumnNamesFromArray(array $columnNames):void {
        foreach ($columnNames as $defaultColumnName => $customName) {
            switch($defaultColumnName) {
                case self::StatementIdCol:
                    $this->statementIdCol = $customName;
                    break;

                case self::SubjectCol:
                    $this->subjectCol = $customName;
                    break;

                case self::PredicateCol:
                    $this->predicateCol = $customName;
                    break;

                case self::ObjectCol:
                    $this->objectCol = $customName;
                    break;

                case self::ValueCol:
                    $this->valueCol = $customName;
                    break;

                case self::CancellationIdCol:
                    $this->cancellationIdCol = $customName;
                    break;
            }
        }
    }
    /**
     * @inheritDoc
     */
    public function makeStatement(int $subject, int $predicate, int|string $object): int
    {
        $dataTable = $this->getDataTableForStatement($subject, $predicate, $object);
        return $this->makeStatementInDataTable($subject, $predicate, $object, $dataTable);
    }

    protected function makeStatementInDataTable(int $subject, int $predicate, int|string $object, DataTable $dataTable) : int {
        $statementId = $this->generateUniqueEntityId();
        try {
            $dataTable->createRow([
                $this->statementIdCol => $statementId,
                $this->subjectCol => $subject,
                $this->predicateCol => $predicate,
                $this->objectCol => is_int($object) ? $object : null,
                $this->valueCol => !is_int($object) ? $object : null,
                $this->cancellationIdCol => null
            ]);
            return $statementId;
        } catch (RowAlreadyExists) {
            // should never happen
            throw new RuntimeException("RowAlreadyExists exception");
        }
    }

    /**
     * Returns the statement data table in which the given statement must be stored
     *
     * @param int $subject
     * @param int $predicate
     * @param int|string $object
     * @return DataTable
     */
    protected function getDataTableForStatement(int $subject, int $predicate, int|string $object) : DataTable {
        return $this->dataTableArray[0];
    }

    /**
     * @inheritDoc
     */
    public function getStatements(int|null $subject, int|null $predicate, string|int|null $object, bool $includeCancelled = false) : array
    {
        $statements = [];
        foreach ($this->dataTableArray as $dataTable) {
            array_push($statements, ...$this->getStatementsInDataTable($dataTable, $subject, $predicate, $object, $includeCancelled));
        }
        return $statements;
    }

    protected function getStatementsInDataTable(DataTable $dataTable,
                                                int|null $subject, int|null $predicate, string|int|null $object,
                                                bool $includeCancelled) : array {

        $statements = [];

        if ($subject === null && $predicate === null && $object===null && $includeCancelled) {
            // all statements
            $rows = $dataTable->getAllRows();
        } else {

            $findSpec = [
                $this->subjectCol => $subject,
                $this->predicateCol => $predicate,
                $this->objectCol => $object,
            ];
            if ($subject === null) {
                unset($findSpec[$this->subjectCol]);
            }
            if ($predicate === null) {
                unset($findSpec[$this->predicateCol]);
            }
            if ($object === null) {
                unset($findSpec[$this->objectCol]);
            }
            $rows = $dataTable->findRows($findSpec);
        }
        foreach($rows as $row){
            if (!$includeCancelled && $row[$this->cancellationIdCol] !== null) {
                continue;
            }
            $statements[] = $this->getStatementFromRow($row);
        }
        return $statements;
    }

    private function getStatementFromRow(array $row) : array {

        return [
            $row[$this->statementIdCol],
            $row[$this->subjectCol],
            $row[$this->predicateCol],
            $row[$this->objectCol] === null ? $row[$this->valueCol] : $row[$this->objectCol],
            $row[$this->cancellationIdCol]
        ];
    }

    public function generateUniqueEntityId(): int
    {
        return Tid::generateUnique();
    }

    /**
     * @inheritDoc
     */
    public function cancelStatement(int $statementId): int
    {
        $statementDataTable = null;
        $statementRow = null;
        foreach($this->dataTableArray as $dataTable) {
            $rows = $dataTable->findRows([$this->statementIdCol => $statementId]);
            if ($rows->count() !== 0) {
                $statementRow = $rows->getFirst();
                $statementDataTable = $dataTable;
                break;
            }
        }

        if ($statementRow === null) {
            return -1;
        }

        if ($statementRow[$this->cancellationIdCol] !== null) {
            return -1;
        }
        
        $cancellationId = $this->generateUniqueEntityId();

        $statementRow[$this->cancellationIdCol] = $cancellationId;

        try {
            $statementDataTable->updateRow($statementRow);
            return $cancellationId;
        } catch (InvalidRowForUpdate) {
            throw new RuntimeException("InvalidRowForUpdate exception");
        }
    }
}