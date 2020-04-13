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
use ThomasInstitut\Profiler\SimpleSqlQueryCounterTrackerAware;
use ThomasInstitut\Profiler\SqlQueryCounterTracker;
use ThomasInstitut\Profiler\SqlQueryCounterTrackerAware;
use ThomasInstitut\TimeString\TimeString;

class ApmCollationTableVersionManager extends CollationTableVersionManager implements LoggerAwareInterface, SqlQueryCounterTrackerAware
{

    use LoggerAwareTrait;
    use SimpleSqlQueryCounterTrackerAware;
    /**
     * @var DataTable
     */
    private $dataTable;

    public function __construct(DataTable $columnVersionTable)
    {
        $this->dataTable = $columnVersionTable;
        $this->setSqlQueryCounterTracker(new SqlQueryCounterTracker());
    }

    /**
     * @inheritDoc
     */
    public function getCollationTableVersionInfo(int $collationTableId, int $numVersions = 0): array
    {
        $this->sqlQueryCounterTracker->incrementSelect();
        $versionRows  = $this->dataTable->findRows([ 'ct_id' => $collationTableId]);

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

    /**
     * @inheritDoc
     */
    public function registerNewCollationTable(int $collationTableId, CollationTableVersionInfo $versionInfo): void
    {
        if ($versionInfo->collationTableId !== $collationTableId) {
            throw new InvalidArgumentException("Collation table Id in info does not correspond to given collation table id");
        }
        if ($versionInfo->authorId === 0) {
            throw new InvalidArgumentException("Version author must not be 0");
        }

        if ($versionInfo->timeFrom === TimeString::TIME_ZERO) {
            throw new InvalidArgumentException("Time from cannot be zero in new version info");
        }

        $currentVersions = $this->getCollationTableVersionInfo($collationTableId);

        if (count($currentVersions) === 0) {
            // first version
            // just create a new entry with timeUntil in the EndOfTimes
            $versionInfo->timeUntil = TimeString::END_OF_TIMES;
            $this->sqlQueryCounterTracker->incrementCreate();
            $this->dataTable->createRow($versionInfo->getDatabaseRow());
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
        $this->dataTable->createRow($versionInfo->getDatabaseRow());
    }

    private function rawUpdateVersion(CollationTableVersionInfo $versionInfo) {
        $this->sqlQueryCounterTracker->incrementUpdate();
        $this->dataTable->updateRow($versionInfo->getDatabaseRow());
    }

}