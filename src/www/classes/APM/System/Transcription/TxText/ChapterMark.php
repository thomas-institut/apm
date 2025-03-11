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

namespace APM\System\Transcription\TxText;

/**
 * Description of TtiUnclear
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ChapterMark extends Item {
    
    const CHAPTER_START = 'start';
    const CHAPTER_END = 'end';

    const SEPARATOR = "\t";
   
    
    function __construct($id, $seq, string $workId, int $chapterNumber,
                         string $type, string $appellation, string $title, int $chapterLevel)
    {
        parent::__construct($id, $seq);
        
        $this->type = Item::CHAPTER_MARK;

        $this->theText = implode(self::SEPARATOR, [self::normalizeString($appellation), self::normalizeString($title)]);
        $this->target = $chapterNumber;
        if ($type !== self::CHAPTER_START && $type !== self::CHAPTER_END) {
             throw new \InvalidArgumentException("Wrong type, must be 'start' "
                     . "or 'end'");
        }
        $this->altText = $type;
        $this->length = $chapterLevel;
        $this->extraInfo = $workId;
    }
    
    function getWorkId()
    {
        return $this->extraInfo;
    }
    
    function getChapterNumber()
    {
        return $this->target;
    }
    
    function getType() {
        return $this->altText;
    }
    
    function getChapterLevel()
    {
        return $this->length;
    }

    function getAppellation() : string {
        return explode(self::SEPARATOR,$this->theText)[0];
    }

    function getTitle(): string {
        return explode(self::SEPARATOR,$this->theText)[1];
    }
}