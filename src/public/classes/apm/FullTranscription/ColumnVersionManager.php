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

namespace APM\FullTranscription;


use ThomasInstitut\TimeString\TimeString;

abstract class ColumnVersionManager
{

    /**
     * Returns an array with version information objects for the given pageId and column ordered by time
     * from older to newer.
     *
     * if numVersions === 0, returns all versions
     * if numVersions > 0, returns only numVersions objects, corresponding to the latest versions.
     *
     * @param int $pageId
     * @param int $column
     * @param int $numVersions
     * @return ColumnVersionInfo[]
     */
    abstract public function getColumnVersionInfoByPageCol(int $pageId, int $column, int $numVersions = 0) : array;

    /**
     * Registers a column version with the given info.
     *
     * id and timeUntil in the given version are ignored. The manager will create a new version info with
     * a new id, and will calculate the timeUntil by placing the given version in the appropriate place chronologically
     * with the versions already in the system.
     *
     * @param int $pageId
     * @param int $column
     * @param ColumnVersionInfo $versionInfo
     */
    abstract public function registerNewColumnVersion(int $pageId, int $column, ColumnVersionInfo $versionInfo) : void;


    /**
     * Checks that the given version sequence is coherent
     * returns an array with all problems found
     * @param array $versions
     * @return array
     */
    public function checkValueSequenceCoherence(array $versions) : array {

        $issues = [];
        $numVersions = count($versions);

        if ($numVersions <=1) {
            return []; // @codeCoverageIgnore
        }

        // check timeUntil's for the rest of versions
        for ($i = 0; $i < $numVersions - 1; $i++) {
            if ($versions[$i]->timeUntil !== $versions[$i+1]->timeFrom ) {
                $issues[] = 'Broken sequence in version index ' . $i . ' timeUntil=' . $versions[$i]->timeUntil .
                    ', next version\'s timeFrom is ' . $versions[$i+1]->timeFrom;
            }
        }
        return $issues;
    }
}
