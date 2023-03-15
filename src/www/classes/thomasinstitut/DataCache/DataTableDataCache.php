<?php
/* 
 *  Copyright (C) 2020 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *  
 */

namespace ThomasInstitut\DataCache;


use InvalidArgumentException;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Psr\Log\NullLogger;
use ThomasInstitut\DataTable\DataTable;
use ThomasInstitut\TimeString\TimeString;

class DataTableDataCache implements DataCache, LoggerAwareInterface
{

    use LoggerAwareTrait;
    const COLUMN_KEY = 'cache_key';
    const COLUMN_VALUE = 'value';

    const COLUMN_EXPIRES = 'expires';

    const COLUMN_SET = 'set_at';

    /**
     * @var DataTable
     */
    private DataTable $dataTable;
    /**
     * @var string
     */
    private string $keyColumn;
    /**
     * @var string
     */
    private string $valueColumn;

    private string $expiresColumn;

    private string $setColumn;

    public function __construct(DataTable $dt,
                                string $keyColumn = self::COLUMN_KEY,
                                string $valueColumn = self::COLUMN_VALUE,
                                string $expiresColumn = self::COLUMN_EXPIRES,
                                string $setColumn = self::COLUMN_SET
    ) {
        $this->dataTable = $dt;
        $this->keyColumn = $keyColumn;
        $this->valueColumn = $valueColumn;
        $this->expiresColumn = $expiresColumn;
        $this->setColumn = $setColumn;
        $this->logger = new NullLogger();
    }

    /**
     * @inheritDoc
     */
    public function get(string $key): string
    {
        $rows =  $this->getRowsForKey($key);
        if ($rows === []) {
            throw new KeyNotInCacheException();
        }
        $row = $rows[0];
        $now = TimeString::now();
        if ($row[$this->expiresColumn] !== TimeString::END_OF_TIMES && $row[$this->expiresColumn] < $now) {
            // expired!
            $this->delete($key);
            throw new KeyNotInCacheException("Key '$key' not in cache");
        }
        return $row[$this->valueColumn];
    }

    /**
     * @inheritDoc
     */
    public function set(string $key, string $value, int $ttl = 0): void
    {

        $rows = $this->getRowsForKey($key);

        $now = microtime(true);
        $expires = TimeString::END_OF_TIMES;
        if ($ttl > 0) {
            $expires = TimeString::fromTimeStamp($now + $ttl);
        }

        if ($rows === []) {
            $this->dataTable->createRow([
                $this->keyColumn => $key,
                $this->valueColumn => $value,
                $this->setColumn => TimeString::fromTimeStamp($now),
                $this->expiresColumn => $expires
            ]);
            return;
        }
        $rowId = $rows[0]['id'];
        $this->dataTable->updateRow([
            'id' => $rowId,
            $this->keyColumn => $key,
            $this->valueColumn => $value,
            $this->setColumn => TimeString::fromTimeStamp($now),
            $this->expiresColumn => $expires
        ]);
    }

    /**
     * @inheritDoc
     */
    public function delete(string $key): void
    {
        $rows = $this->getRowsForKey($key);
        if ($rows === []) {
            return;
        }
        $rowId = $rows[0]['id'];
        $this->dataTable->deleteRow($rowId);
    }


    private function getRowsForKey(string $key) : array {
        return $this->dataTable->findRows([ $this->keyColumn => $key]);
    }

    public function isInCache(string $key): bool
    {
        return count($this->getRowsForKey($key))!==0;
    }

    public function clear(): void
    {
        // TODO: make a special version for MySqlDataTable
        //  need a truncate option in DataTable!
        $ids = $this->dataTable->getUniqueIds();
        foreach ($ids as $id) {
            $this->dataTable->deleteRow($id);
        }
    }

    public function clean(): void
    {
        $uniqueRowIds  = $this->dataTable->getUniqueIds();

        $idsToDelete = [];
        $now = TimeString::now();

        foreach ($uniqueRowIds as $id) {
            try {
                $row = $this->dataTable->getRow($id);
            } catch (InvalidArgumentException) {
                // the row was probably deleted since we got all unique IDs,
                // that's fine, just ignore and continue with next
                continue;
            }
            if ($row[$this->expiresColumn] !== TimeString::END_OF_TIMES && $row[$this->expiresColumn] < $now) {
                // expired!
                $idsToDelete[] = $id;
            }
        }
        $numIdsToDelete = count($idsToDelete);
        if ($numIdsToDelete !== 0) {
            $this->logger->info("Deleting $numIdsToDelete expired item(s) from cache");
        }

        foreach ($idsToDelete as $id) {
            $this->dataTable->deleteRow($id);
        }
    }
}