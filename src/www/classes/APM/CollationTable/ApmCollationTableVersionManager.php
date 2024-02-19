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


use InvalidArgumentException;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use ThomasInstitut\DataTable\DataTable;
use ThomasInstitut\DataTable\RowAlreadyExists;
use ThomasInstitut\Profiler\SimpleSqlQueryCounterTrackerAware;
use ThomasInstitut\Profiler\SqlQueryCounterTracker;
use ThomasInstitut\Profiler\SqlQueryCounterTrackerAware;
use ThomasInstitut\TimeString\TimeString;

class ApmCollationTableVersionManager extends CollationTableVersionManager implements LoggerAwareInterface, SqlQueryCounterTrackerAware
{

    use LoggerAwareTrait;
    use SimpleSqlQueryCounterTrackerAware;

    const MAX_DESCRIPTION_LENGTH = 2000;

    /**
     * @var DataTable
     */
    private DataTable $columnVersionTable;

    public function __construct(DataTable $columnVersionTable)
    {
        $this->columnVersionTable = $columnVersionTable;
        $this->setSqlQueryCounterTracker(new SqlQueryCounterTracker());
    }

    /**
     * @inheritDoc
     */
    public function getCollationTableVersionInfo(int $collationTableId, int $numVersions = 0): array
    {
        $this->sqlQueryCounterTracker->incrementSelect();
        $versionRows  = $this->columnVersionTable->findRows([ 'ct_id' => $collationTableId]);

        $versions = [];
        foreach($versionRows as $row) {
            $versions[] = CollationTableVersionInfo::createFromDbRow($row);
        }

        usort($versions, function ($a, $b) {
            /** @var $a CollationTableVersionInfo */
            /** @var $b CollationTableVersionInfo */
            return strcmp($a->timeFrom, $b->timeFrom);
        } );

        if ($numVersions <= 0) {
            return $versions;
        }

        return array_slice($versions, -1 * $numVersions);
    }

    public function updateTimesForVersion(int $versionId, string $timeFrom, string $timeUntil) : void {
        $versionInfo = CollationTableVersionInfo::createFromDbRow($this->columnVersionTable->getRow($versionId));
        $versionInfo->timeFrom = $timeFrom;
        $versionInfo->timeUntil = $timeUntil;
        $this->rawUpdateVersion($versionInfo);
    }

    /**
     * @inheritDoc
     */
    public function registerNewCollationTableVersion(int $collationTableId, CollationTableVersionInfo $versionInfo): void
    {
        if ($versionInfo->collationTableId !== $collationTableId) {
            throw new InvalidArgumentException("Collation table Id in info does not correspond to given collation table id");
        }
        if ($versionInfo->authorTid === 0) {
            throw new InvalidArgumentException("Version author tid must not be 0");
        }

        if ($versionInfo->timeFrom === TimeString::TIME_ZERO) {
            throw new InvalidArgumentException("Time from cannot be zero in new version info");
        }

        // make sure the description is not longer than what the database can hold
        // Error reported by Oded, 10 Nov 2021
        $versionInfo->description = $this->getProperLengthVersionDescription($versionInfo->description);

        $currentVersions = $this->getCollationTableVersionInfo($collationTableId);

        if (count($currentVersions) === 0) {
            // first version
            // just create a new entry with timeUntil in the EndOfTimes
            $versionInfo->timeUntil = TimeString::END_OF_TIMES;
            $this->sqlQueryCounterTracker->incrementCreate();
            try {
                $this->columnVersionTable->createRow($versionInfo->getDatabaseRow());
            } catch (RowAlreadyExists $e) {
                throw new InvalidArgumentException("Version has already existing ID but it should be new");
            }
            return;
        }

        // start by supposing that the new version should be positioned before the first current version
        $insertAfter = -1;

        // look for the right position in the sequence of versions
        for ($i = 0; $i < count($currentVersions); $i++) {
            if ($currentVersions[$i]->timeFrom === $versionInfo->timeFrom || $currentVersions[$i]->timeUntil === $versionInfo->timeFrom) {
                // Versions cannot have exactly the same times!
                throw new InvalidArgumentException("Given version info timeFrom is exactly the same as the in version id " . $currentVersions[$i]->id);
            }
            if ($currentVersions[$i]->timeFrom > $versionInfo->timeFrom) {
                // we're past the new version's timeFrom, no need to keep searching
                // this should only happen if $insertAfter === -1
                break;
            }
            if ($currentVersions[$i]->timeFrom < $versionInfo->timeFrom && $currentVersions[$i]->timeUntil > $versionInfo->timeFrom) {
                $insertAfter = $i;
                break;
            }
        }

        if ($insertAfter > -1) {
            // update the timeUntil of version at $insertAfter
            $currentVersions[$insertAfter]->timeUntil = $versionInfo->timeFrom;
            $this->rawUpdateVersion($currentVersions[$insertAfter]);
        }

        if (count($currentVersions) > ($insertAfter + 1)) {
            $versionInfo->timeUntil = $currentVersions[$insertAfter+1]->timeFrom;
        } else {
            $versionInfo->timeUntil = TimeString::END_OF_TIMES;
        }

        $this->sqlQueryCounterTracker->incrementCreate();
        try {
            $this->columnVersionTable->createRow($versionInfo->getDatabaseRow());
        } catch (RowAlreadyExists $e) {
            // should never happen
            throw new \RuntimeException("Could not create DB row for version");
        }
    }

    private function rawUpdateVersion(CollationTableVersionInfo $versionInfo): void
    {
        $this->sqlQueryCounterTracker->incrementUpdate();
        $this->columnVersionTable->updateRow($versionInfo->getDatabaseRow());
    }

    public function getActiveCollationTableIdsForUser(int $userTid): array
    {

        $this->getSqlQueryCounterTracker()->incrementSelect();
         $rows = $this->columnVersionTable->findRows(['author_tid' => $userTid, 'time_until' => TimeString::END_OF_TIMES]);

         $ids = [];
         foreach($rows as $row) {
             $ids[] = intval($row['ct_id']);
         }

         return $ids;

    }

    private function getProperLengthVersionDescription(string $description) : string {
        if (strlen($description) > self::MAX_DESCRIPTION_LENGTH) {
            return substr($description, 0, self::MAX_DESCRIPTION_LENGTH - 5) . ' ...';
        }
        return $description;
    }

    public function getAllCollationTableIds(): array
    {

        // TODO: fix this, I'm just using a trick here
        $this->getSqlQueryCounterTracker()->incrementSelect();
        $maxCtId = $this->columnVersionTable->getMaxValueInColumn('ct_id');
        $ids = [];
        for ($i=1; $i<= $maxCtId; $i++) {
            $ids[] = $i;
        }
        return $ids;
    }

//    public function fixVersionSequence(int $ctId): array
//    {
//        return [];
//    }
}