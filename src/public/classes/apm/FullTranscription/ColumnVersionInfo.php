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

/**
 * Column version info as given in the APM database
 * @package APM\FullTranscription
 */
class ColumnVersionInfo
{
    /**
     * @var int
     */
    public $id;
    /**
     * @var int
     */
    public $pageId;
    /**
     * @var int
     */
    public $column;
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
        $this->pageId = 0;
        $this->column = 0;
        $this->timeFrom = TimeString::TIME_ZERO;
        $this->timeUntil = TimeString::TIME_ZERO;
        $this->authorId = 0;
        $this->description = '';
        $this->isMinor = false;
        $this->isReview = false;
    }

    public function setFromDbRow(array $row) {
        $this->id = intval($row['id']);
        $this->pageId = intval($row['page_id']);
        $this->column = intval($row['col']);
        $this->timeFrom = $row['time_from'];
        $this->timeUntil = $row['time_until'];
        $this->authorId = intval($row['author_id']);
        $this->description = $row['descr'];
        $this->isMinor = $row['minor'] !== 0;
        $this->isReview = $row['review'] !== 0;
    }

    public static function createFromDbRow(array $row) {
        $ci = new ColumnVersionInfo();
        $ci->setFromDbRow($row);
        return $ci;
    }

    public function getDatabaseRow() : array {
        return [
            'id' => $this->id,
            'page_id' => $this->pageId,
            'col' => $this->column,
            'time_from' => $this->timeFrom,
            'time_until' => $this->timeUntil,
            'author_id' => $this->authorId,
            'descr' => $this->description,
            'minor' => $this->isMinor ? 1 : 0,
            'review' => $this->isReview ? 1 : 0
        ];
    }

}