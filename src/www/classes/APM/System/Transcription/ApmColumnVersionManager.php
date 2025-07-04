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

namespace APM\System\Transcription;


use InvalidArgumentException;
use RuntimeException;
use ThomasInstitut\DataTable\DataTable;
use ThomasInstitut\DataTable\InvalidRowForUpdate;
use ThomasInstitut\DataTable\RowAlreadyExists;
use ThomasInstitut\TimeString\TimeString;

class ApmColumnVersionManager extends ColumnVersionManager
{

    /**
     * @var DataTable
     */
    private DataTable $dataTable;

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

        if ($versionInfo->authorTid === 0) {
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
            try {
                $this->dataTable->createRow($versionInfo->getDatabaseRow());
            } catch (RowAlreadyExists) {
                throw new InvalidArgumentException("New version with already existing ID");
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

        try {
            $this->dataTable->createRow($versionInfo->getDatabaseRow());
        } catch (RowAlreadyExists) {
            throw new RuntimeException("Already existing id in version info");
        }
    }

    public function getPublishedVersions() : array {
        $rows = $this->dataTable->findRows([ 'is_published' => 1]);
        $versions = [];
        foreach($rows as $row) {
            $versions[] = ColumnVersionInfo::createFromDbRow($row);
        }
        return $versions;
    }



    private function rawUpdateVersion(ColumnVersionInfo $versionInfo): void
    {

        try {
            $this->dataTable->updateRow($versionInfo->getDatabaseRow());
        } catch (InvalidRowForUpdate $e) {
            throw new RuntimeException("Invalid row for update while updating column version: "  . $e->getMessage());
        }
    }


    /**
     * Marks a version as published
     * @param int $versionId
     * @return void
     */
    public function publishVersion(int $versionId): void
    {
        $versionInfo = $this->getVersionInfo($versionId);
        if ($versionInfo->isPublished) {
            return;
        }
        $versionInfo->isPublished= true;
        $this->rawUpdateVersion($versionInfo);

    }

    /**
     * Marks a version as unpublished
     * @param int $versionId
     */
    public function unPublishVersion(int $versionId): void
    {
        $versionInfo = $this->getVersionInfo($versionId);
        if (!$versionInfo->isPublished) {
            return;
        }
        $versionInfo->isPublished= false;
        $this->rawUpdateVersion($versionInfo);
    }

    public function getVersionInfo(int $versionId): ColumnVersionInfo
    {

        $row = $this->dataTable->getRow($versionId);
        if ($row === null) {
            throw new InvalidArgumentException("Version $versionId does not exist");
        }
        return ColumnVersionInfo::createFromDbRow($row);
//        try {
//            $row = $this->dataTable->getRow($versionId);
//        } catch(InvalidArgumentException) {
//            throw new InvalidArgumentException("Version $versionId does not exist");
//        }
//        return ColumnVersionInfo::createFromDbRow($row);

    }
}