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


use InvalidArgumentException;
use ThomasInstitut\DataTable\DataTable;
use ThomasInstitut\TimeString\TimeString;

class ApmColumnVersionManager extends ColumnVersionManager
{

    /**
     * @var DataTable
     */
    private $dataTable;

    public function __construct(DataTable $columnVersionTable)
    {
        $this->dataTable = $columnVersionTable;
    }

    /**
     * @inheritDoc
     */
    public function getColumnVersionInfoByPageCol(int $pageId, int $column, int $numVersions = 0): array
    {
        $versionRows  = $this->dataTable->findRows([ 'page_id' => $pageId, 'col' => $column]);

        $versions = [];
        foreach($versionRows as $row) {
            $versions[] = ColumnVersionInfo::createFromDbRow($row);
        }

        usort($versions, function ($a, $b) {
            /** @var $a ColumnVersionInfo */
            /** @var $b ColumnVersionInfo */
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
    public function registerNewColumnVersion(int $pageId, int $column, ColumnVersionInfo $versionInfo): void
    {

        if ($versionInfo->pageId !== $pageId) {
            throw new InvalidArgumentException("Page Id in info does not correspond to given page id");
        }

        if ($versionInfo->column !== $column) {
            throw new InvalidArgumentException("Column in info does not correspond to given column");
        }

        if ($versionInfo->authorId === 0) {
            throw new InvalidArgumentException("Version author must not be 0");
        }

        if ($versionInfo->timeFrom === TimeString::TIME_ZERO) {
            throw new InvalidArgumentException("Time from cannot be zero in new version info");
        }

        $currentVersions = $this->getColumnVersionInfoByPageCol($pageId, $column);

        if (count($currentVersions) === 0) {
            // first version
            // just create a new entry with timeUntil in the EndOfTimes
            $versionInfo->timeUntil = TimeString::END_OF_TIMES;
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

        $this->dataTable->createRow($versionInfo->getDatabaseRow());
    }

    private function rawUpdateVersion(ColumnVersionInfo $versionInfo) {
        $this->dataTable->updateRow($versionInfo->getDatabaseRow());
    }


}