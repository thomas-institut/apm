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

class MockCollationTableManager extends CollationTableManager
{

    /**
     * @inheritDoc
     */
    public function saveNewCollationTable(array $collationTableData, \APM\CollationTable\CollationTableVersionInfo $versionInfo): int
    {
        // TODO: Implement saveNewCollationTable() method.
    }

    public function saveCollationTable(int $collationTableId, array $collationTableData, \APM\CollationTable\CollationTableVersionInfo $versionInfo)
    {
        // TODO: Implement saveCollationTable() method.
    }

    public function getCollationTableByIdWithTimestamp(int $collationTableId, string $timeStamp)
    {
        // TODO: Implement getCollationTableByIdWithTimestamp() method.
    }

    public function getCollationTableByIdWithVersion(int $id, int $versionId)
    {
        // TODO: Implement getCollationTableByIdWithVersion() method.
    }

    public function getCollationTableVersionManager(): \APM\CollationTable\CollationTableVersionManager
    {
        // TODO: Implement getCollationTableVersionManager() method.
    }

    public function getErrorMessage(): string
    {
        // TODO: Implement getErrorMessage() method.
    }

    public function getErrorCode(): int
    {
        // TODO: Implement getErrorCode() method.
    }

    public function getCollationTableIdsForChunk(string $chunkId, string $timeString): array
    {
        // TODO: Implement getCollationTableIdsForChunk() method.
        return [];
    }

    public function getCollationTableTitle(int $id, string $timeStamp): string
    {
        // TODO: Implement getCollationTableTitle() method.
        return 'Test';
    }
}