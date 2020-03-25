<?php
/* 
 *  Copyright (C) 2019 Universität zu Köln
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

/**
 * Information about a page
 *
 * @package APM\FullTranscription
 */
class PageInfo
{

    /**
     * @var int
     */
    public $docId;
    /**
     * @var int
     */
    public $pageNumber;
    /**
     * @var int
     */
    public $imageNumber;
    /**
     * @var int
     */
    public $sequence;
    /**
     * @var int
     */
    public $type;
    /**
     * @var string
     */
    public $langCode;
    /**
     * @var int
     */
    public $numCols;
    /**
     * @var string
     */
    public $foliation;
    /**
     * @var int
     */
    public $pageId;

    public function __construct()
    {
        $this->pageId = 0;
        $this->docId = 0;
        $this->pageNumber = 0;
        $this->imageNumber = 0;
        $this->sequence = 0;
        $this->type = 0;
        $this->langCode = '';
        $this->numCols = 0;
        $this->foliation = '';
    }

    public function setFromDatabaseRow(array $row) {
        $this->pageId = (int) $row['id'];
        $this->docId = (int) $row['doc_id'];
        $this->pageNumber = (int) $row['page_number'];
        $this->imageNumber = (int) $row['img_number'];
        $this->sequence = (int) $row['seq'];
        $this->type = (int) $row['type'];
        $this->langCode = $row['lang'];
        $this->numCols = (int)$row['num_cols'];
        if (is_null($row['foliation'])) {
            $this->foliation = $this->pageNumber;
        } else {
            $this->foliation = $row['foliation'];
        }
    }

    public static function createFromDatabaseRow(array $row) : PageInfo {
        $pageInfo = new PageInfo();
        $pageInfo->setFromDatabaseRow($row);
        return $pageInfo;
    }

    public function getDatabaseRow() : array {
        return [
            'id' => $this->pageId,
            'doc_id' => $this->docId,
            'page_number' => $this->pageNumber,
            'img_number' => $this->imageNumber,
            'seq' => $this->sequence,
            'type' => $this->type,
            'lang' => $this->langCode,
            'num_cols' => $this->numCols,
            'foliation' => $this->foliation
        ];
    }

}