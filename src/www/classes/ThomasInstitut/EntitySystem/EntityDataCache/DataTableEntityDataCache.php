<?php

namespace ThomasInstitut\EntitySystem\EntityDataCache;

use Closure;
use Psr\Log\LoggerAwareTrait;
use RuntimeException;
use ThomasInstitut\DataTable\DataTable;
use ThomasInstitut\DataTable\InvalidRowForUpdate;
use ThomasInstitut\DataTable\NullLogger;
use ThomasInstitut\DataTable\RowAlreadyExists;
use ThomasInstitut\EntitySystem\EntityData;

/**
 * An EntityDataCache that uses a DataTable as storage
 *
 * The underlying database table MUST have the following columns defined
 *
 *   * id:  int
 *   * tid: int64
 *   * dataId: string | text | varchar
 *   * setAt: int
 *   * expires: int
 *   * data: long text
 *
 * None should have a default value, and all but id and tid must be nullable.
 *
 * It is possible to use custom names for these columns. See this class constructor for details.
 *
 * The table can have extra columns that store data extracted from the entity. The value generator for these
 * extra columns is set in the class constructor.
 *
 */
class DataTableEntityDataCache implements EntityDataCache
{

    const string IdColumn = 'id';
    const string TidColumn = 'tid';
    const string DataIdColumn = 'dataId';
    const string SetAtColumn = 'setAt';
    const string ExpiresColumn = 'expires';
    const string DataColumn = 'data';

    use LoggerAwareTrait;
    private DataTable $dataTable;
    protected array $columnMap;
    protected string $idCol;
    protected string $dataCol;
    protected string $tidCol;
    protected string $dataIdCol;
    protected string $setAtCol;
    protected string $expiresCol;
    protected bool $deleteRowsWhenInvalidating;
    private bool $nullifyColumnsWhenInvalidating;

    /**
     * Constructs a new entity data cache object
     *
     * The optional $extraColumnsMap should be an associative array with the desired DataTable columns as
     * keys. The value should a callable that takes an EntityData object returns a value to store in the data table.
     * The value should be the one expected by the underlying database. The class does not check for this in advance
     * so if it's not correct the underlying database might throw an exception.
     *
     *    $extraColumnsMap = [
     *       'extraColumnName' => callable  // e.g. function (EntityData $ed) { return 'value' }
     *       'anotherColumn' => callable
     *    ]
     *
     * The optional $columnNames parameter that allows the data table to use custom names for the different columns:
     *
     *   $columnNames = [  defaultColumnName => 'customName', .... ]
     *
     * @param DataTable $dataTable
     * @param array $extraColumnsMap
     * @param bool $deleteRowsWhenInvalidating
     * @param bool $nullifyColumnsWhenInvalidating
     * @param array $columnNames
     */
    public function __construct(DataTable $dataTable,
                                array     $extraColumnsMap = [],
                                bool      $deleteRowsWhenInvalidating = false,
                                bool      $nullifyColumnsWhenInvalidating = false,
                                array     $columnNames = [])
    {
        $this->dataTable = $dataTable;
        $this->setLogger(new NullLogger());
        $this->deleteRowsWhenInvalidating = $deleteRowsWhenInvalidating;
        $this->nullifyColumnsWhenInvalidating = $nullifyColumnsWhenInvalidating;

        $this->idCol = self::IdColumn;
        $this->dataCol = self::DataColumn;
        $this->tidCol = self::TidColumn;
        $this->dataIdCol = self::DataIdColumn;
        $this->setAtCol = self::SetAtColumn;
        $this->expiresCol = self::ExpiresColumn;

        $this->setColumnNamesFromArray($columnNames);


        $this->columnMap = [
            $this->dataCol => $this->getDataSerializerGenerator()
        ];

        $systemColumns = [ $this->idCol, $this->dataCol, $this->tidCol,
            $this->dataIdCol, $this->setAtCol, $this->expiresCol];

        foreach($extraColumnsMap as $columnName => $generator) {
            if (in_array($columnName, $systemColumns)) {
                // do not allow setting a generator for system columns
                continue;
            }
            if (!is_callable($generator)) {
                continue;
            }
            $this->columnMap[$columnName] = $generator;
        }
    }

    private function setColumnNamesFromArray(array $columnNames) : void {
        foreach($columnNames as $defaultName => $customName) {
            switch($defaultName) {
                case self::IdColumn:
                    $this->idCol = $customName;
                    break;

                case self::TidColumn:
                    $this->tidCol = $customName;
                    break;

                case self::DataIdColumn:
                    $this->dataIdCol = $customName;
                    break;

                case self::SetAtColumn:
                    $this->setAtCol = $customName;
                    break;

                case self::ExpiresColumn:
                    $this->expiresCol = $customName;
                    break;

                case self::DataColumn:
                    $this->dataCol  = $customName;
                    break;
            }
        }
    }


    /**
     * @inheritDoc
     */
    public function getData(int $tid, string $dataId = ''): EntityData
    {
        $rows = $this->dataTable->findRows([ $this->tidCol => $tid]);
        if ($rows->count() === 0) {
            throw new EntityNotInCacheException();
        }
        $theRow = $rows->getFirst();
        $now = time();
        if (!$this->isDataInRowValid($theRow, $dataId, $now)) {
            throw new EntityNotInCacheException();
        }
        return unserialize($rows->getFirst()[$this->dataCol]);
    }

    /**
     * @inheritDoc
     */
    public function setData(int $tid, EntityData $entityData, string $dataId, int $ttl = -1 ): void
    {
        $createNewRow = false;
        $currentRows = $this->dataTable->findRows([ $this->tidCol => $tid]);
        $rowId = -1;
        if ($currentRows->count() === 0) {
            $createNewRow = true;
        } else {
            $rowId = $currentRows->getFirst()[$this->idCol];
        }
        $now = time();
        $row = [
            $this->tidCol => $tid,
            $this->dataIdCol => $dataId,
            $this->setAtCol => $now,
            $this->expiresCol => $ttl <= 0 ? -1 : $now + $ttl
        ];

        foreach($this->columnMap as $colName => $generator) {
//            print "Getting value for entity $tid, column $colName...";
            $value = $generator($entityData);
//            print "value is $value\n";
            $row[$colName] = $value;
        }

        if ($createNewRow) {
            try {
                unset($row[$this->idCol]);
                $this->dataTable->createRow($row);
            } catch (RowAlreadyExists $e) {
                throw new RuntimeException("Row already exists exception: " . $e->getMessage(), $e->getCode()) ;
            }
        } else {
            $row[$this->idCol] = $rowId;
            try {
                $this->dataTable->updateRow($row);
            } catch (InvalidRowForUpdate $e) {
                throw new RuntimeException("Invalid row for update exception: " . $e->getMessage(), $e->getCode()) ;
            }
        }
    }

    /**
     * Returns true if the row represents a cache entry with valid data.
     *
     * Checks for dataId and expiration is the given $dataId and $timeStamp are not null
     *
     * @param array $row
     * @param string|null $dataId
     * @param int|null $timeStamp
     * @return bool
     */
    protected function isDataInRowValid(array $row, ?string $dataId, ?int $timeStamp) : bool {
        if ($row[$this->dataCol] === null ) {
            return false;
        }
        if ($dataId !== null && $row[$this->dataIdCol] !== $dataId) {
            return false;
        }
        if ($timeStamp !== null && $row[$this->expiresCol] >= 0 && $timeStamp > $row[$this->expiresCol])  {
            return false;
        }

        return true;
    }

    /**
     * @inheritDoc
     */
    public function invalidateData(int $tid): void
    {
        $rows = $this->dataTable->findRows([ $this->tidCol => $tid]);
        if ($rows->count() === 0) {
           return;
        }
        $theRow = $rows->getFirst();
        if (!$this->isDataInRowValid($theRow, null, null)) {
            // already invalidated, nothing to do
            return;
        }
        if ($this->deleteRowsWhenInvalidating) {
            $this->dataTable->deleteRow($theRow[$this->idCol]);
            return;
        }
        if ($this->nullifyColumnsWhenInvalidating) {
            foreach(array_keys($this->columnMap) as $columnName) {
                $theRow[$columnName] = null;
            }
        }
        $theRow[$this->dataIdCol] = null;
        try {
            $this->dataTable->updateRow($theRow);
        } catch (InvalidRowForUpdate) {
            // should never happen
            throw new RuntimeException("Invalid row for update exception");
        }
    }

    public function clean(?string $dataId): void
    {
        $localTransaction = false;
        if (!$this->dataTable->isInTransaction()) {
            $localTransaction = $this->dataTable->startTransaction();
        }
        $allRows = $this->dataTable->getAllRows();
        $now = time();
        foreach($allRows as $row) {
            if (!$this->isDataInRowValid($row, $dataId, $now)) {
                if ($this->deleteRowsWhenInvalidating) {
                    $this->dataTable->deleteRow($row[$this->idCol]);
                } else {
                    foreach(array_keys($this->columnMap) as $columnName) {
                        $row[$columnName] = null;
                    }
                    $row[$this->dataIdCol] = null;
                    try {
                        $this->dataTable->updateRow($row);
                    } catch (InvalidRowForUpdate) {
                        // should never happen
                        throw new RuntimeException("Invalid row for update exception");
                    }
                }
            }
        }
        if ($localTransaction) {
            $this->dataTable->commit();
        }
    }

    public function clear() : void
    {
        $localTransaction = false;
        if (!$this->dataTable->isInTransaction()) {
            $localTransaction = $this->dataTable->startTransaction();
        }

        $allRows = $this->dataTable->getAllRows();
        foreach ($allRows as $row) {
            $this->invalidateData($row[$this->tidCol]);
        }

        $this->clean(null);
        if ($localTransaction) {
            $this->dataTable->commit();
        }
    }

    protected function getDataSerializerGenerator(): Closure
    {
        return function (EntityData $ed) : string {
            return serialize($ed);
        };
    }





}


