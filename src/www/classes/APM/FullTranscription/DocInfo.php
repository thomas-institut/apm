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


class DocInfo
{
    /**
     * @var int
     */
    public int $id;
    /**
     * @var string
     */
    public string $title;
    /**
     * @var string
     */
    public string $languageCode;
    /**
     * @var string
     */
    public string $type;
    /**
     * @var string
     */
    public string $imageSource;
    /**
     * @var string
     */
    public string $imageSourceData;
    /**
     * @var string
     */
    public string $shortTitle;

    /**
     * Array of page Ids, not filled up from a simple database query!
     * @var array
     */
    public array $pageIds;

    public function __construct()
    {
        $this->id = 0;
        $this->title = '';
        $this->shortTitle = '';
        $this->languageCode = '';
        $this->type = '';
        $this->imageSource = '';
        $this->imageSourceData = '';
        $this->pageIds = [];
    }

    public function setFromDatabaseRow(array $row): void
    {
        $this->id = intval($row['id']);
        $this->title = $row['title'];
        $this->languageCode = $row['lang'];
        $this->type = $row['doc_type'];
        $this->imageSource = $row['image_source'];
        $this->imageSourceData = $row['image_source_data'];
    }

    public static function createFromDatabaseRow(array $row) : DocInfo {
        $docInfo = new DocInfo();
        $docInfo->setFromDatabaseRow($row);
        return $docInfo;
    }
}