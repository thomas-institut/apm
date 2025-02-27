<?php

/* 
 *  Copyright (C) 2019-204 Universität zu Köln
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

class EditorialNote {
    

    public int $id = 0;
    public int $type;
    
    const OFFLINE = 1;
    const INLINE = 2;
    public int $target = 0;
    public int $authorTid = 0;
    public string $text = '';
    public string $time = '';
    public string $lang = '';
    
    public function __construct() {
        $this->type = self::INLINE;
    }
    
    
    public static function constructEdNoteFromDatabaseRow(array $theRow): EditorialNote|bool
    {
        $editorialNote = self::constructEdNoteFromArray($theRow);
        if ($editorialNote === false) {
            return false;
        }
        $editorialNote->authorTid = intval($theRow['author_tid']) ?? 0;
        return $editorialNote;
    }
    
    public static function constructEdNoteFromArray($theArray): EditorialNote|bool
    {
        $editorialNote = new EditorialNote();

        if (!isset($theArray['type'])) {
            return false;
        }
        $type = (int) $theArray['type'];
        if (!$editorialNote->isTypeValid($type)) {
            return false;
        }
        $editorialNote->setType($type);
        $editorialNote->id = intval($theArray['id']) ?? 0;
        $editorialNote->authorTid = intval($theArray['authorTid'] ?? 0);
        $editorialNote->lang = $theArray['lang'] ?? '';
        $editorialNote->target = intval($theArray['target']) ?? 0;
        $editorialNote->time = $theArray['time'] ?? '';
        $editorialNote->text = self::normalizeTextValue($theArray['text'] ?? '');

        return $editorialNote;
    }

    /**
     * Normalizes a string according to rules for textual items:
     *   - trims all whitespace at the beginning and end of the string
     *   - converts all whitespace inside the string to a single space
     *
     * @param string $str
     * @return string
     */
    private static function normalizeTextValue(string $str) : string
    {
        return preg_replace('/\s+/', ' ', trim($str));
    }
    
//    public function setText(string $text): void
//    {
//        $this->text = self::normalizeTextValue($text);
//    }
    
    public function setType($type): void
    {
        if ($this->isTypeValid($type)) {
            $this->type = $type;
        }
    }
    
    private function isTypeValid($type): bool
    {
        return $type === self::OFFLINE || $type === self::INLINE;
    }
}
