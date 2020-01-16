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
    public $id;
    /**
     * @var string
     */
    public $title;
    /**
     * @var string
     */
    public $languageCode;
    /**
     * @var string
     */
    public $type;
    /**
     * @var string
     */
    public $imageSource;
    /**
     * @var string
     */
    public $imageSourceData;
    /**
     * @var string
     */
    public $shortTitle;

    public function __construct()
    {
        $this->id = 0;
        $this->title = '';
        $this->shortTitle = '';
        $this->languageCode = '';
        $this->type = '';
        $this->imageSource = '';
        $this->imageSourceData = '';
    }

    public function setFromDatabaseRow(array $row) {
        $this->id = intval($row['id']);
        $this->title = $row['title'];
        $this->shortTitle = $row['short_title'];
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