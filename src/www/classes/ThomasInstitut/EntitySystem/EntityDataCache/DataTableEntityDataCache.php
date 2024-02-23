<?php

namespace ThomasInstitut\EntitySystem\EntityDataCache;

use Psr\Log\LoggerAwareTrait;
use RuntimeException;
use ThomasInstitut\DataTable\DataTable;
use ThomasInstitut\DataTable\InvalidRowForUpdate;
use ThomasInstitut\DataTable\NullLogger;
use ThomasInstitut\DataTable\RowAlreadyExists;
use ThomasInstitut\EntitySystem\EntityData;

class DataTableEntityDataCache implements EntityDataCache
{

    use LoggerAwareTrait;
    private DataTable $dataTable;
    private array $columnMappings;

    public function __construct(DataTable $dataTable, array $extraColumnMapping = [])
    {
        $this->dataTable = $dataTable;
        $this->setLogger(new NullLogger());
        $this->columnMappings = [
            [
                'columnName' => 'data',
                'mappingFunction' =>
                    function (EntityData $ed) : string {
                        return serialize($ed);
                }
            ]
        ];

        foreach($extraColumnMapping as $columnMapping) {
            if (!isset($columnMapping['columnName']) || !isset($columnMapping['mappingFunction'])) {
                continue;
            }
            if (!is_string($columnMapping['columnName']) || !is_callable($columnMapping['mappingFunction'])) {
                continue;
            }
            $this->columnMappings[] = $columnMapping;
        }
    }



    /**
     * @inheritDoc
     */
    public function getData(int $tid, string $dataId = ''): EntityData
    {
        $rows = $this->dataTable->findRows([ 'tid' => $tid]);
        if ($rows->count() === 0) {
            throw new EntityNotInCacheException();
        }
        $theRow = $rows->getFirst();
        $now = time();
        if (($theRow['expires'] <= 0 && $now > $theRow['expires']) || $theRow['data'] === null || $theRow['dataId'] !== $dataId) {
            throw new EntityNotInCacheException();
        }
        return unserialize($rows->getFirst()['data']);
    }

    /**
     * @inheritDoc
     */
    public function setData(int $tid, EntityData $data, int $ttl = -1, string $dataId = ''): void
    {
        $createNewRow = false;
        $currentRows = $this->dataTable->findRows([ 'tid' => $tid]);
        $rowId = 0;
        if ($currentRows->count() === 0) {
            $createNewRow = true;
            $rowId = $currentRows->getFirst()['id'];
        }
        $row = [
            'tid' => $tid,
            'dataId' => $dataId,
            'setAt' => time(),
            'expires' => $ttl <= 0 ? -1 : $ttl
        ];

        foreach($this->columnMappings as $mapping) {
            $row[$mapping['columnName']] = $mapping['mappingFunction']($data);
        }

        if ($createNewRow) {
            try {
                $this->dataTable->createRow($row);
            } catch (RowAlreadyExists $e) {
                throw new RuntimeException("Row already exists exception: " . $e->getMessage(), $e->getCode()) ;
            }
        } else {
            $row['id'] = $rowId;
            try {
                $this->dataTable->updateRow($row);
            } catch (InvalidRowForUpdate $e) {
                throw new RuntimeException("Invalid row for update exception: " . $e->getMessage(), $e->getCode()) ;
            }
        }
    }

    /**
     * @inheritDoc
     */
    public function invalidateData(int $tid): void
    {
        $rows = $this->dataTable->findRows([ 'tid' => $tid]);
        if ($rows->count() === 0) {
           return;
        }
        $theRow = $rows->getFirst();
        $now = time();
        if ($now > $theRow['expires'] || $theRow['data'] === null) {
            return;
        }
        $theRow['data'] = null;
        try {
            $this->dataTable->updateRow($theRow);
        } catch (InvalidRowForUpdate) {
            throw new RuntimeException("Invalid row for update exception");
        }
    }

    public function clean(): void
    {
        $localTransaction = false;
        if (!$this->dataTable->isInTransaction()) {
            $localTransaction = $this->dataTable->startTransaction();
        }
        $allRows = $this->dataTable->getAllRows();
        $now = time();
        foreach($allRows as $row) {
            if (($row['expires'] <= 0 && $now > $row['expires']) || $row['data'] === null) {
                foreach($this->columnMappings as $mapping) {
                    $row[$mapping['columnName']] = null;
                }
                $row['dataId'] = '';
                try {
                    $this->dataTable->updateRow($row);
                } catch (InvalidRowForUpdate) {
                    throw new RuntimeException("Invalid row for update exception");
                }
            }
        }
        if ($localTransaction) {
            $this->dataTable->commit();
        }
    }

    public function flush() : void
    {
        $localTransaction = false;
        if (!$this->dataTable->isInTransaction()) {
            $localTransaction = $this->dataTable->startTransaction();
        }

        $allRows = $this->dataTable->getAllRows();
        foreach ($allRows as $row) {
            $this->invalidateData($row['tid']);
        }

        $this->clean();
        if ($localTransaction) {
            $this->dataTable->commit();
        }
    }



}


