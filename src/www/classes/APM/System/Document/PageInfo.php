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

namespace APM\System\Document;

/**
 * Information about a page
 *
 * @package APM\FullTranscription
 */
class PageInfo
{

    /**
     * The doc id in the database
     *
     * When setting it, make sure to transform document entity ids into database id
     * with the DocumentManager->getLegacyDocId() method
     *
     * @var int
     */
    public int $docId;
    /**
     * @var int
     */
    public int $pageNumber;
    /**
     * @var int
     */
    public int $imageNumber;
    /**
     * @var int
     */
    public int $sequence;
    /**
     * The page's type, an entity id
     * @var int
     */
    public int $type;

    /**
     * The page's main language, an entity id
     * @var int
     */
    public int $lang;
    /**
     *
     * @var string|null
     * @deprecated defaults to '', do not use
     */
    public ?string $langCode;
    /**
     * @var int
     */
    public int $numCols;
    /**
     * @var string
     */
    public string $foliation;
    /**
     * @var int
     */
    public int $pageId;
    /**
     * If false, the value for $this->foliation is derived from the sequence number
     * because it is not explicitly set in the database
     * @var bool
     */
    public bool $foliationIsSet;

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
        $this->foliationIsSet = false;
    }

    public function setFromDatabaseRow(array $row): void
    {
        $this->pageId = intval($row['id']);
        $this->docId = intval($row['doc_id']);
        $this->pageNumber = intval($row['page_number']);
        $this->imageNumber = intval($row['img_number']);
        $this->sequence = intval($row['seq']);
        $this->type = intval($row['type']);
        $this->numCols = (int)$row['num_cols'];
        if (is_null($row['foliation'])) {
            $this->foliation = $this->sequence;
            $this->foliationIsSet = false;
        } else {
            $this->foliation = $row['foliation'];
            $this->foliationIsSet = true;
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
            'lang' => $this->lang,
            'num_cols' => $this->numCols,
            'foliation' => $this->foliationIsSet ? $this->foliation : null
        ];
    }

}