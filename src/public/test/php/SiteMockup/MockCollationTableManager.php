<?php
/* 
 *  Copyright (C) 2016-2020 Universität zu Köln
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

use APM\CollationTable\CollationTableManager;
use APM\CollationTable\CollationTableVersionInfo;
use APM\CollationTable\CollationTableVersionManager;

class MockCollationTableManager extends CollationTableManager
{

    /**
     * @inheritDoc
     */
    public function saveNewCollationTable(array $collationTableData, CollationTableVersionInfo $versionInfo): int
    {
        // TODO: Implement saveNewCollationTable() method.
        return 1;
    }

    public function saveCollationTable(int $collationTableId, array $collationTableData, CollationTableVersionInfo $versionInfo) : void
    {
        // TODO: Implement saveCollationTable() method.
    }

    public function getCollationTableById(int $collationTableId, string $timeStamp = '') : array
    {
        // TODO: Implement getCollationTableByIdWithTimestamp() method.
        return [];
    }

    public function getCollationTableVersionManager(): CollationTableVersionManager
    {
        // TODO: Implement getCollationTableVersionManager() method.
    }

    public function getErrorMessage(): string
    {
        // TODO: Implement getErrorMessage() method.
        return '';
    }

    public function getErrorCode(): int
    {
        // TODO: Implement getErrorCode() method.
        return 0;
    }

    public function getCollationTableIdsForChunk(string $chunkId, string $timeString): array
    {
        // TODO: Implement getCollationTableIdsForChunk() method.
        return [];
    }

    public function getCollationTableTitle(int $id, string $timeStamp = ''): string
    {
        // TODO: Implement getCollationTableTitle() method.
        return 'Test';
    }
}