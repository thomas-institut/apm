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

use ThomasInstitut\TimeString\TimeString;

/**
 * Column version info as given in the APM database
 * @package APM\FullTranscription
 */
class ColumnVersionInfo
{

    public int $id;
    public int $pageId;
    public int $column;
    public string $timeFrom;
    public string $timeUntil;
//    /**
//     * @var int
//     * @deprecated
//     */
//    public int $authorId;
    public int $authorTid;
    public string $description;
    public bool $isMinor;
    public bool $isReview;
    public bool $isPublished;


    public function __construct()
    {
        $this->id = 0;
        $this->pageId = 0;
        $this->column = 0;
        $this->timeFrom = TimeString::TIME_ZERO;
        $this->timeUntil = TimeString::TIME_ZERO;
        $this->authorTid = 0;
        $this->description = '';
        $this->isMinor = false;
        $this->isReview = false;
        $this->isPublished = false;
    }

    public function setFromDbRow(array $row): void
    {
        $this->id = intval($row['id']);
        $this->pageId = intval($row['page_id']);
        $this->column = intval($row['col']);
        $this->timeFrom = $row['time_from'];
        $this->timeUntil = $row['time_until'];
        $this->authorTid = intval($row['author_tid']);
        $this->description = $row['descr'];
        $this->isMinor = intval($row['minor']) !== 0;
        $this->isReview = intval($row['review']) !== 0;
        $this->isPublished = intval($row['is_published']) !== 0;
    }

    public static function createFromDbRow(array $row): ColumnVersionInfo
    {
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
            'author_tid' => $this->authorTid,
            'descr' => $this->description,
            'minor' => $this->isMinor ? 1 : 0,
            'review' => $this->isReview ? 1 : 0,
            'is_published' => $this->isPublished ? 1 : 0
        ];
    }

}