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

use ThomasInstitut\TimeString\TimeString;

/**
 * Class CollationTableInfo
 * @package APM\CollationTable
 */
class CollationTableInfo
{
    /** @var string */
    public string $type;
    /** @var string */
    public string $title;

    public bool $archived;

    public string $timeFrom;
    public string $timeUntil;

    public function __construct()
    {
        $this->title = '';
        $this->type = '';
        $this->timeFrom =  TimeString::TIME_ZERO;
        $this->timeUntil = TimeString::END_OF_TIMES;
        $this->archived = false;
    }

    public function setFromDbRow(array $row) {
        $this->title = $row['title'];
        $this->type = $row['type'];
        $this->archived = intval($row['archived']) === 1;
        $this->timeFrom = $row['valid_from'] ?? TimeString::TIME_ZERO;
        $this->timeUntil = $row['valid_until'] ?? TimeString::END_OF_TIMES;
    }

    public static function createFromDbRow(array $row): CollationTableInfo
    {
        $ci = new CollationTableInfo();
        $ci->setFromDbRow($row);
        return $ci;
    }

}