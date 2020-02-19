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
}