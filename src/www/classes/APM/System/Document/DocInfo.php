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

namespace APM\System\Document;


use APM\EntitySystem\Schema\Entity;
use ThomasInstitut\EntitySystem\EntityData;

class DocInfo
{

    public int $id;
    public string $title;
    public ?int $imageSource;
    public ?string $imageSourceData;
    public array $pageIds;
    /**
     * @var int
     * @deprecated use $id
     */
    public int $tid;
    public ?int $language;
    public ?int $type;

    public function __construct()
    {
        $this->id = 0;
        $this->tid = 0;
        $this->title = '';
        $this->language = null;
        $this->type = null;
        $this->imageSource = null;
        $this->imageSourceData = '';
        $this->pageIds = [];
    }

    public function setFromEntityData(EntityData $data) : void {
        $this->id = $data->id;
        $this->tid = $data->id;
        $this->title = $data->name;
        $this->language = $data->getObjectForPredicate(Entity::pDocumentLanguage);
        $this->type = $data->getObjectForPredicate(Entity::pDocumentType);
        $this->imageSource = $data->getObjectForPredicate(Entity::pImageSource);
        $this->imageSourceData = $data->getObjectForPredicate(Entity::pImageSourceData);
    }

//    public function setFromDatabaseRow(array $row): void
//    {
//        $this->id = intval($row['id']);
//        $this->tid = intval($row['tid'] ?? 0);
//        $this->title = $row['title'];
//
//        $this->typeName = $row['doc_type'];
//        $this->imageSource = $row['image_source'];
//        $this->imageSourceData = $row['image_source_data'];
//    }

//    public static function createFromDatabaseRow(array $row) : DocInfo {
//        $docInfo = new DocInfo();
//        $docInfo->setFromDatabaseRow($row);
//        return $docInfo;
//    }
}