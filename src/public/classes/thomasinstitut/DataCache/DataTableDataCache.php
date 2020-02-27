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


use ThomasInstitut\DataTable\DataTable;

class DataTableDataCache implements DataCache
{
    const COLUMN_KEY = 'cachekey';
    const COLUMN_VALUE = 'value';
    /**
     * @var DataTable
     */
    private $dataTable;
    /**
     * @var string
     */
    private $keyColumn;
    /**
     * @var string
     */
    private $valueColumn;

    public function __construct(DataTable $dt, string $keyColumn = self::COLUMN_KEY, string $valueColumn = self::COLUMN_VALUE) {
        $this->dataTable = $dt;
        $this->keyColumn = $keyColumn;
        $this->valueColumn = $valueColumn;
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
        return $rows[0][$this->valueColumn];
    }

    /**
     * @inheritDoc
     */
    public function set(string $key, string $value): void
    {

        $rows = $this->getRowsForKey($key);
        if ($rows === []) {
            $this->dataTable->createRow([ $this->keyColumn => $key, $this->valueColumn => $value]);
            return;
        }
        $rowId = $rows[0]['id'];
        $this->dataTable->updateRow([ 'id' => $rowId, $this->keyColumn => $key, $this->valueColumn => $value]);
    }

    /**
     * @inheritDoc
     */
    public function delete(string $key): void
    {
        $rows = $this->getRowsForKey($key);
        if ($rows === []) {
            throw new KeyNotInCacheException();
        }
        $rowId = $rows[0]['id'];
        $this->dataTable->deleteRow($rowId);
    }

    private function getRowsForKey(string $key) : array {
        return $this->dataTable->findRows([ $this->keyColumn => $key]);
    }
}