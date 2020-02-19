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


use ThomasInstitut\DataTable\DataTable;

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

        uasort($versions, function ($a, $b) {
            /** @var $a ColumnVersionInfo */
            /** @var $b ColumnVersionInfo */
            return strcmp($a->timeFrom, $b->timeFrom);
        } );

        if ($numVersions <= 0) {
            return $versions;
        }

        return array_slice($versions, -1 * $numVersions);
    }
}