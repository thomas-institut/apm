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

namespace APM\CollationTable;


use ThomasInstitut\ErrorReporter\ErrorReporter;

/**
 * Class CollationTableManager
 *
 * Manages stored collation table standard data structures in the system
 *
 *
 * @package APM\CollationTable
 */
abstract class CollationTableManager implements ErrorReporter
{

    /**
     * Saves a new collation table in the system. Returns the Id of the new collation table
     * or -1 if there's an error.
     * @param array $collationTableData
     * @param CollationTableVersionInfo $versionInfo
     * @return int
     */
    abstract public function saveNewCollationTable(array $collationTableData, CollationTableVersionInfo $versionInfo) : int;

    /**
     * @param int $collationTableId
     * @param array $collationTableData
     * @param CollationTableVersionInfo $versionInfo
     */
    abstract public function saveCollationTable(int $collationTableId, array $collationTableData, CollationTableVersionInfo $versionInfo) : void;

    /**
     * Returns an array with the table Ids for tables for the given chunkId
     * @param string $chunkId
     * @param string $timeString
     * @return int[]
     */
    abstract public function getCollationTableIdsForChunk(string $chunkId, string $timeString) : array;

    /**
     * Get the collation table data array for the given table Id at the given time
     *
     * if $timeStamp is '', returns the latest version of the collation table
     *
     * @param int $collationTableId
     * @param string $timeStamp
     * @return array
     */
    abstract public function getCollationTableById(int $collationTableId, string $timeStamp = '') : array;
    abstract public function getCollationTableTitle(int $id, string $timeStamp) : string;

    abstract public function getCollationTableVersionManager() : CollationTableVersionManager;

    public function getCollationTableVersions(int $ctId) {
        return $this->getCollationTableVersionManager()->getCollationTableVersionInfo($ctId);
    }

}