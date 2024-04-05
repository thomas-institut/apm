<?php

namespace ThomasInstitut\EntitySystem;


use InvalidArgumentException;
use Psr\Log\LoggerAwareTrait;
use RuntimeException;
use ThomasInstitut\DataTable\DataTable;
use ThomasInstitut\DataTable\InvalidRowForUpdate;
use ThomasInstitut\DataTable\RowAlreadyExists;
use ThomasInstitut\EntitySystem\Exception\StatementAlreadyCancelledException;
use ThomasInstitut\EntitySystem\Exception\StatementNotFoundException;


/**
 * A StatementStorage that uses a DataTable for actual storage
 *
 * The DataTable must have at least the following columns defined
 *
 * * id: int
 * * statementId: int
 * * subject: int
 * * predicate: int
 * * object: int|null
 * * value: string|null
 * * cancellationId: int|null
 *
 * If statement or cancellation metadata are used, the following two columns must be
 * defined as well:
 *
 * * statementMetadata: text (JSON)
 * * cancellationMetadata: text (JSON)
 *
 * The actual names for the columns can be different and must be given at construction time.
 *
 * The DataTable can have any number of extra columns whose values are calculated at statement storage
 * or cancellation time. See the constructor for details.
 *
 */
class DataTableStatementStorage implements StatementStorage
{

    const StatementIdCol = 'statementId';
    const SubjectCol = 'subject';
    const PredicateCol = 'predicate';
    const ObjectCol = 'object';
    const ValueCol = 'value';
    const CancellationIdCol = 'cancellationId';

    const StatementMetadataCol = 'statementMetadata';
    const CancellationMetadataCol = 'cancellationMetadata';

    use LoggerAwareTrait;


    private DataTable $dataTable;
    private string $statementIdCol;
    private string $subjectCol;
    private string $predicateCol;
    private string $objectCol;
    private string $valueCol;
    private string $cancellationIdCol;
    private string $statementMetadataCol;
    private string $cancellationMetadataCol;
    private array $columnMap;
    private bool $optimizeMetadataColumns;




    /**
     * Constructs a StatementStorage using the given DataTable as storage.
     *
     * $extraColumnMap is an associative array that maps a column to the value of a metadata entry for
     * a given predicate id or to a callable that generates the value. By default, predicates will be reported
     * a part of the statement metadata. Instead of a predicate, an associative array can be given indicating
     * whether the predicate is to be reported in the cancellation metadata instead
     * For example:
     *
     * ```
     * [
     *      'extraColumn1' => somePredicateId,
     *      'anotherColumn' => [  'predicate' => somePredicateId, 'cancellationMetadata' => true],
     *      'someOtherExtraColumn' =>  function (int $subject, int $predicate,
     *          int $object,
     *          bool $isCancellation, array $metadata) : int|string|null|bool {
     *          if (isCancellation) {
     *              // calculate something
     *              // ...
     *              return $columnValue
     *          } else {
     *              // calculate something
     *              // ...
     *              return $someOtherColumnValue
     *          }
     *      }
     * ]
     * ```
     *
     * The same map is used to generate extra column values when storing and when cancelling a statement.
     * If a predicateId is given, if the predicate is not present in the metadata, the column is not updated. So,
     * if statement and cancellation metadata use different predicates, there are no overwrites between them.
     * If a callable is given, the column will not be updated if it returns any value that is not a string, an int
     * or null.
     *
     * It is up to the user to make sure that the underlying database accepts the object/value for the predicate or the
     * value returned by the given callable.
     *
     *
     * @param DataTable $dataTable
     * @param array $extraColumnMap
     * @param array $columnNames
     * @param bool $optimizeMetadataColumns
     */
    public function __construct(DataTable $dataTable, array $extraColumnMap, array $columnNames = [], bool $optimizeMetadataColumns = true)
    {
        $this->dataTable = $dataTable;

        $this->statementIdCol = self::StatementIdCol;
        $this->subjectCol = self::SubjectCol;
        $this->predicateCol = self::PredicateCol;
        $this->objectCol = self::ObjectCol;
        $this->valueCol = self::ValueCol;
        $this->cancellationIdCol = self::CancellationIdCol;
        $this->statementMetadataCol = self::StatementMetadataCol;
        $this->cancellationMetadataCol = self::CancellationMetadataCol;
        $this->setColumnNamesFromArray($columnNames);

        $this->columnMap = $this->getCleanColumnMap($extraColumnMap);

        $this->optimizeMetadataColumns = $optimizeMetadataColumns;

    }

    private function getCleanColumnMap(array $extraColumnMap) : array {
        $cleanMap = [];
        $systemColumns = [ $this->statementIdCol, $this->subjectCol,
            $this->predicateCol, $this->objectCol, $this->valueCol,
            $this->cancellationIdCol, $this->statementMetadataCol, $this->cancellationMetadataCol];
        foreach(array_keys($extraColumnMap) as $columnName) {
            if (in_array($columnName, $systemColumns)) {
                $this->logger->alert("Ignoring system column name $columnName in extra column map");
                continue;
            }
            $colValue = $extraColumnMap[$columnName];
            $goodValue = false;
            if (is_int($colValue)) {
                $cleanMap[$columnName] = [
                    'predicate' => $colValue,
                    'cancellationMetadata' => false,
                    'forceLiteralValue' => false
                ];
                $goodValue = true;
            }
            if (is_array($colValue) && isset($colValue['predicate']) && is_int($colValue['predicate'])) {
                $cleanMap[$columnName] = [
                    'predicate' => $colValue['predicate'],
                    'cancellationMetadata' => $colValue['cancellationMetadata'] ?? false,
                    'forceLiteralValue' => $colValue['forceLiteralValue'] ?? false
                ];
                $goodValue = true;
            }
            if (is_callable($colValue)) {
                $cleanMap[$columnName] = [
                    'callable' => $colValue,
                    'forceLiteralValue' => $colValue['forceLiteralValue'] ?? false
                ];
                $goodValue = true;
            }
            if (!$goodValue) {
                throw new InvalidArgumentException("Predicate or callable not found in extra column map");
            }
        }
        return $cleanMap;
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

                case self::StatementMetadataCol:
                    $this->statementMetadataCol = $customName;
                    break;

                case self::CancellationMetadataCol:
                    $this->cancellationMetadataCol = $customName;
                    break;
            }
        }
    }

    /**
     * @inheritDoc
     */
    public function storeStatement(int $statementId, int $subject, int $predicate, int|string $object, array $statementMetadata = []): void
    {
        if ($statementId < 0) {
            throw new InvalidArgumentException("Invalid statementId");
        }

        if ($subject < 0) {
            throw new InvalidArgumentException("Invalid subject");
        }

        if ($predicate < 0) {
            throw new InvalidArgumentException("Invalid predicate");
        }

        if (is_int($object) && $object < 0) {
            throw new InvalidArgumentException("Invalid object");
        }

        $currentRows = $this->dataTable->findRows([ $this->statementIdCol => $statementId]);
        if ($currentRows->count() !== 0) {
            throw  new InvalidArgumentException("Statement with id $statementId already exists in storage");
        }

        $newRow = [
            $this->statementIdCol => $statementId,
            $this->subjectCol => $subject,
            $this->predicateCol => $predicate,
            $this->objectCol => is_int($object) ? $object : null,
            $this->valueCol => !is_int($object) ? $object : null,
        ];


        $extraColumnValues = $this->getExtraColumnValues($subject, $predicate, $object, false, $statementMetadata);
        foreach(array_keys($extraColumnValues) as $extraColumn) {
            $newRow[$extraColumn] = $extraColumnValues[$extraColumn];
        }

        if (count($statementMetadata) !== 0) {
            if ($this->optimizeMetadataColumns) {
                $optimizedMetadata = $this->getOptimizedMetadata($statementMetadata, false);
                if (count($optimizedMetadata) !== 0) {
                    $newRow[$this->statementMetadataCol] = json_encode($optimizedMetadata);
                }
            } else {
                $newRow[$this->statementMetadataCol] = json_encode($statementMetadata);
            }
        }

        try {
            $this->dataTable->createRow($newRow);
        } catch (RowAlreadyExists) {
            // should never happen
            throw new RuntimeException("RowAlreadyExists exception");
        }
    }

    private function getOptimizedMetadata(array $metadata, bool $cancellationMetadata) : array {
        $optimizedMetadata = [];
        $extraColumns  = array_keys($this->columnMap);
        $predicatesInExtraColumns = [];
        foreach($extraColumns as $columnName) {
            $mapEntry = $this->columnMap[$columnName];
            if (!isset($mapEntry['predicate'])) {
                continue;
            }
            if ($mapEntry['cancellationMetadata'] === $cancellationMetadata) {
                $predicatesInExtraColumns[] = $mapEntry['predicate'];
            }
        }
        foreach ($metadata as $metadatum) {
            [ $predicate,] = $metadatum;
            if (!in_array($predicate, $predicatesInExtraColumns)) {
                $optimizedMetadata[] = $metadatum;
            }
        }
        return $optimizedMetadata;
    }

    /**
     * @inheritDoc
     */
    public function retrieveStatement(int $statementId, bool $withMetadata = true): array
    {
        $rows = $this->dataTable->findRows([ $this->statementIdCol => $statementId]);
        if ($rows->count() === 0) {
            throw new StatementNotFoundException();
        }
        return $this->getStatementFromRow($rows->getFirst(), $withMetadata);
    }

    /**
     * @inheritDoc
     */
    public function cancelStatement(int $statementId, int $cancellationId, array $cancellationMetadata = []): void
    {
        $rows = $this->dataTable->findRows([ $this->statementIdCol => $statementId]);
        if ($rows->count() === 0) {
            throw new StatementNotFoundException();
        }

        $row = $rows->getFirst();

        [ , $subject, $predicate, $object, $currentCancellationId ] = $this->getStatementFromRow($row, false);
        if ($currentCancellationId !== null) {
            throw new StatementAlreadyCancelledException();
        }

        $row[$this->cancellationIdCol] = $cancellationId;

        $extraColumnValues = $this->getExtraColumnValues($subject, $predicate, $object, true, $cancellationMetadata);

        foreach(array_keys($extraColumnValues) as $extraColumn) {
            $row[$extraColumn] = $extraColumnValues[$extraColumn];
        }

        if (count($cancellationMetadata) !== 0) {
            if ($this->optimizeMetadataColumns) {
                $optimizedMetadata = $this->getOptimizedMetadata($cancellationMetadata, true);
                if (count($optimizedMetadata) !== 0) {
                    $row[$this->cancellationMetadataCol] = json_encode($optimizedMetadata);
                }
            } else {
                $row[$this->cancellationMetadataCol] = json_encode($cancellationMetadata);
            }
        }

        try {
            $this->dataTable->updateRow($row);
        } catch (InvalidRowForUpdate) {
            throw new RuntimeException("InvalidRowForUpdate exception");
        }
    }

    /**
     * @inheritDoc
     */
    public function findStatements(int|null $subject, int|null $predicate, string|int|null $object,
                                   bool $withMetadata = true, bool $includeCancelled = false): array
    {
        $statements = [];

        if ($subject === null && $predicate === null && $object===null && $includeCancelled) {
            // all statements
            $rows = $this->dataTable->getAllRows();
        } else {
            $findSpec = [
                $this->subjectCol => $subject,
                $this->predicateCol => $predicate,
            ];
            if (!is_null($object)) {
                if (is_string($object)) {
                    $findSpec[$this->valueCol] = $object;
                } else {
                    $findSpec[$this->objectCol] = $object;
                }
            }
            if ($subject === null) {
                unset($findSpec[$this->subjectCol]);
            }
            if ($predicate === null) {
                unset($findSpec[$this->predicateCol]);
            }
            $rows = $this->dataTable->findRows($findSpec);
        }
        foreach($rows as $row){
            $cId = $row[$this->cancellationIdCol];
            if ($cId === null || $includeCancelled) {
                $statements[] = $this->getStatementFromRow($row, $withMetadata);
            }
        }
        return $statements;
    }

    private function getStatementFromRow(array $row, bool $withMetadata) : array {
        $statement = [
            $row[$this->statementIdCol],
            $row[$this->subjectCol],
            $row[$this->predicateCol],
            $row[$this->objectCol] === null ? $row[$this->valueCol] : $row[$this->objectCol],
            $row[$this->cancellationIdCol],
            null,
            null
        ];

        if ($withMetadata) {
            $statement[5] = $this->getMetadataFromRow($row, $this->statementMetadataCol, false);
            $statement[6] = $this->getMetadataFromRow($row, $this->cancellationMetadataCol, true);
        }

        return $statement;
    }

    private function getMetadataFromRow(array $row, string $metadataCol, bool $isCancellationMetadata) : array {
        $metadata = [];
        foreach(array_keys($this->columnMap) as $columName) {
            $mapEntry = $this->columnMap[$columName];
            if (!isset($mapEntry['predicate'])) {
                continue;
            }
            if ($mapEntry['cancellationMetadata'] === $isCancellationMetadata) {
                if ($row[$columName] !== null) {
                    $metadata[] = [
                        $mapEntry['predicate'],
                        $mapEntry['forceLiteralValue'] ? strval($row[$columName]) : $row[$columName]
                    ];
                }
            }
        }
        if ($row[$metadataCol] !== null) {
            $additionalMetadata = json_decode($row[$metadataCol], false);
            foreach($additionalMetadata as $additionalMetadatum) {
                $metadata[] = $additionalMetadatum;
            }
        }

        return $metadata;
    }


    /**
     * @inheritDoc
     * @throws StatementAlreadyCancelledException
     * @throws StatementNotFoundException
     */
    public function storeMultipleStatementsAndCancellations(array $statementsAndCancellations): void
    {

        $debug = false;

        $debug && print("Storing " . count($statementsAndCancellations) . " statements/cancellations at once\n");
        $debug && var_dump($statementsAndCancellations);

        $inLocalTransaction = false;
        if (!$this->dataTable->isInTransaction()) {
            $inLocalTransaction = $this->dataTable->startTransaction();
        }

        $debug && print("Local transaction: " . ($inLocalTransaction ? 'true' : 'false') . "\n");

        foreach($statementsAndCancellations as $index => $command) {
            $commandName = $command[0];
            $debug && print("Command $index: $commandName\n");
            switch($commandName) {
                case self::StoreStatementCommand:
                    [ ,$statementId, $subject, $predicate, $object, $metadata ] = $command;

                    if (!is_int($statementId)){
                        $this->dataTable->rollBack();
                        throw new InvalidArgumentException("Invalid statement id in $commandName command $index");
                    }

                    if (!is_int($subject)){
                        $this->dataTable->rollBack();
                        throw new InvalidArgumentException("Invalid subject in $commandName command $index");
                    }

                    if (!is_int($predicate)){
                        $this->dataTable->rollBack();
                        throw new InvalidArgumentException("Invalid predicate in $commandName command $index");
                    }

                    if (!(is_int($object)||is_string($object))){
                        $this->dataTable->rollBack();
                        throw new InvalidArgumentException("Invalid object in $commandName command $index");
                    }

                    if (!is_array($metadata)){
                        $this->dataTable->rollBack();
                        throw new InvalidArgumentException("Invalid metadata in $commandName command $index");
                    }

                    try {
                        $this->storeStatement($statementId, $subject, $predicate, $object, $metadata);
                    } catch (InvalidArgumentException $e) {
                        $this->dataTable->rollBack();
                        throw new InvalidArgumentException("Invalid argument in $commandName command $index: " . $e->getMessage(), $e->getCode());
                    } catch (RuntimeException $e) {
                        $this->dataTable->rollBack();
                        throw new RuntimeException("RuntimeException in $commandName command $index: " . $e->getMessage(), $e->getCode());
                    }
                    break;

                case self::CancelStatementCommand:
                    [ , $statementId, $cancellationId, $metadata] = $command;
                    if (!is_int($cancellationId)){
                        $this->dataTable->rollBack();
                        throw new InvalidArgumentException("Invalid cancellation id in $commandName command $index");
                    }
                    if (!is_int($statementId)){
                        $this->dataTable->rollBack();
                        throw new InvalidArgumentException("Invalid statement id in $commandName command $index");
                    }
                    if (!is_array($metadata)){
                        $this->dataTable->rollBack();
                        throw new InvalidArgumentException("Invalid metadata in $commandName command $index");
                    }
                    try {
                        $this->cancelStatement($statementId, $cancellationId, $metadata);
                    } catch (StatementAlreadyCancelledException $e) {
                        $this->dataTable->rollBack();
                        throw new StatementAlreadyCancelledException($e->getMessage() . " in $commandName command $index");

                    } catch (StatementNotFoundException $e) {
                        $this->dataTable->rollBack();
                        throw new StatementNotFoundException($e->getMessage() . " in $commandName command $index");
                    }
                    break;

                default:
                    $this->dataTable->rollBack();
                    throw new \InvalidArgumentException("Invalid command '$commandName'");
            }
        }

        if ($inLocalTransaction) {
            $debug && print "Committing...";
            $commitResult = $this->dataTable->commit();
            if ($this->dataTable->supportsTransactions() && !$commitResult) {
                throw new RuntimeException("Could not commit local transaction when storing/cancelling statements");
            }
        }

        $debug && print("Done\n");
    }

    private function getExtraColumnValues(int $subject, int $predicate, int|string $object, bool $isCancellation, array $metadata) : array {
        $extraColumnValues = [];
        foreach(array_keys($this->columnMap) as $extraColumnName) {
            if (isset($this->columnMap[$extraColumnName]['predicate'])) {
                $predicateToFind = $this->columnMap[$extraColumnName]['predicate'];
                $value = false;
                foreach($metadata as $metadataEntry) {
                    [ $metadataPredicate, $metadataObject ] = $metadataEntry;
                    if ($metadataPredicate === $predicateToFind) {
                        $value = $metadataObject;
                        break;
                    }
                }
            } else {
                $value = $this->columnMap[$extraColumnName]['callable']($subject, $predicate, $object, $isCancellation, $metadata);
            }
            if ($value !== false) {
                $extraColumnValues[$extraColumnName] = $value;
            }
        }
        return $extraColumnValues;
    }

    /**
     * @inheritDoc
     */
    public function retrieveStatementByCancellationId(int $cancellationId, bool $withMetadata = true): array
    {
        $rows = $this->dataTable->findRows([ $this->cancellationIdCol => $cancellationId]);
        if ($rows->count() === 0) {
            throw new StatementNotFoundException();
        }
        return $this->getStatementFromRow($rows->getFirst(), $withMetadata);
    }


}