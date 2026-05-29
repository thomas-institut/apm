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
namespace APM\Core\Item;

/**
 * A chunk mark
 * 
 * The information about type (start/end), work, chunk number and segment is encoded
 * in the mark's text:
 *  <type>-<work>-<chunkNumber>-<segment>
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ChapterMark extends Mark {
    

    const TYPE_START = 'START';
    const TYPE_END = 'END';

    const DELIMITER = "\t";
    
    public function __construct(string $type, string $work, int $chapterNumber, int $chapterLevel, string $appellation, string $title) {
        parent::__construct(MarkType::CHAPTER);
        $this->setMarkText(implode(self::DELIMITER, [$type, $work, $chapterNumber, $chapterLevel, $appellation, $title]));
    }
    
    public function getType() : string {
        return explode(self::DELIMITER, $this->getMarkText())[0];
    }
    
    public function getWork() : string {
        return explode(self::DELIMITER, $this->getMarkText())[1];
    }
    
    public function getChapterNumber() : int {
        return intVal(explode(self::DELIMITER, $this->getMarkText())[2]);
    }
    
    public function getChapterLevel() : int {
        return intVal(explode(self::DELIMITER, $this->getMarkText())[3]);
    }

    public function getAppellation() : string {
        return explode(self::DELIMITER, $this->getMarkText())[4];
    }

    public function getTitle() : string {
        return explode(self::DELIMITER, $this->getMarkText())[5];
    }

    public function getData(): array
    {
        $data = parent::getData();
        $data['type'] = 'ChunkMark';
        $data['chapterNumber'] = $this->getChapterNumber();
        $data['chapterLevel'] = $this->getChapterLevel();
        $data['workId'] = $this->getWork();
        $data['appellation'] = $this->getAppellation();
        $data['chapterTitle'] = $this->getTitle();
        return $data;
    }

}
