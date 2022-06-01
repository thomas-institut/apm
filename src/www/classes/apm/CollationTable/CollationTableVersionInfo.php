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

use ThomasInstitut\TimeString\TimeString;

/**
 * Column version info as given in the APM database
 * @package APM\FullTranscription
 */
class CollationTableVersionInfo
{
    /**
     * The version Id
     * @var int
     */
    public $id;
    /**
     * Collation table Id
     * @var string
     */
    public $collationTableId;
//    /**
//     * @var int
//     */
//    public $column;
    /**
     * @var string
     */
    public $timeFrom;
    /**
     * @var string
     */
    public $timeUntil;
    /**
     * @var int
     */
    public $authorId;
    /**
     * @var string
     */
    public $description;
    /**
     * @var bool
     */
    public $isMinor;
    /**
     * @var bool
     */
    public $isReview;

    public function __construct()
    {
        $this->id = 0;
        $this->collationTableId = 'AW00-0';
        $this->timeFrom = TimeString::TIME_ZERO;
        $this->timeUntil = TimeString::TIME_ZERO;
        $this->authorId = 0;
        $this->description = '';
        $this->isMinor = false;
        $this->isReview = false;
    }

    public function setFromDbRow(array $row) {
        $this->id = intval($row['id']);
        $this->collationTableId = intval($row['ct_id']);
        $this->timeFrom = $row['time_from'];
        $this->timeUntil = $row['time_until'];
        $this->authorId = intval($row['author_id']);
        $this->description = $row['descr'];
        $this->isMinor = intval($row['minor']) !== 0;
        $this->isReview = intval($row['review']) !== 0;
    }

    public static function createFromDbRow(array $row) {
        $ci = new CollationTableVersionInfo();
        $ci->setFromDbRow($row);
        return $ci;
    }

    public function getDatabaseRow() : array {
        return [
            'id' => $this->id,
            'ct_id' => $this->collationTableId,
            'time_from' => $this->timeFrom,
            'time_until' => $this->timeUntil,
            'author_id' => $this->authorId,
            'descr' => $this->description,
            'minor' => $this->isMinor ? 1 : 0,
            'review' => $this->isReview ? 1 : 0
        ];
    }

}