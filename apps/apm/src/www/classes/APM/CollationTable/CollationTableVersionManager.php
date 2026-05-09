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

namespace APM\CollationTable;

abstract class CollationTableVersionManager
{

    /**
     * Returns an array with version information objects for the given collation table id ordered by time
     * from older to newer.
     *
     * if numVersions === 0, returns all versions
     * if numVersions > 0, returns only numVersions objects, corresponding to the latest versions.
     *
     * @param int $collationTableId
     * @param int $numVersions
     * @return CollationTableVersionInfo[]
     */
    abstract public function getCollationTableVersionInfo(int $collationTableId, int $numVersions = 0) : array;

    /**
     * Registers a collation table version with the given info.
     *
     * id and timeUntil in the given version are ignored. The manager will create a new version info with
     * a new version id, and will calculate the timeUntil by placing the given version in the appropriate place chronologically
     * with the versions already in the system.
     *
     * @param int $collationTableId
     * @param CollationTableVersionInfo $versionInfo
     */
    abstract public function registerNewCollationTableVersion(int $collationTableId, CollationTableVersionInfo $versionInfo) : void;

    /**
     * Returns an array with the collation table ids of the tables currently active for the given
     * user tid
     * @param int $userTid
     * @return int[]
     */
    abstract public function getActiveCollationTableIdsForUser(int $userTid) : array;

    /**
     * Returns an array with all the ctIds in the system
     * @return int[]
     */
    abstract public function getAllCollationTableIds() : array;


//    /**
//     * Enforces a correct version sequence for the given collation table
//
//     * @param int $ctId
//     * @return array
//     */
//    abstract public function fixVersionSequence(int $ctId) : array;

    /**
     * @param int $versionId
     * @param string $timeFrom
     * @param string $timeUntil
     * @return void
     */
    abstract public function updateTimesForVersion(int $versionId, string $timeFrom, string $timeUntil) : void;


    /**
     * Checks that the given version sequence is coherent
     * returns an array with all problems found
     * @param CollationTableVersionInfo[] $versions
     * @return string[]
     */
    public function checkVersionSequenceConsistency(array $versions) : array {

        //  In a coherent version sequence of m versions:
        //  - timeUntil in version n is exactly the same as timeFrom in version n+1 for all n < m,
        //  - timeFrom < timeUntil for all n

        $issues = [];
        $numVersions = count($versions);

        if ($numVersions <=1) {
            return []; // @codeCoverageIgnore
        }

        // check timeUntil's for the rest of versions
        for ($i = 0; $i < $numVersions; $i++) {
            if ($versions[$i]->timeFrom > $versions[$i]->timeUntil) {
                $issues[] = sprintf("timeFrom > timeUntil in version index %d (id = %d): %s > %s", $i,
                    $versions[$i]->id, $versions[$i]->timeFrom, $versions[$i]->timeUntil) ;
            }
            if ($i < $numVersions - 1) {
                if ($versions[$i]->timeUntil !== $versions[$i+1]->timeFrom ) {
                    $issues[] = sprintf("Broken sequence in version index %d (id = %d): timeUntil is %s, next version's timeFrom is %s",
                        $i, $versions[$i]->id, $versions[$i]->timeUntil, $versions[$i+1]->timeFrom);
                }
            }
        }
        return $issues;
    }
}
