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

/**
 *
 * EditorialNote: 
 *      type:  offline | inline 
 *      target: offline note mark or inline node id
 *      text: markup 
 *      author: Person = SQL people.id with 'annotator' in the person's role.
 *      creationTime : DateTime
 *      language:  ar | he | la | de | en | fr
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */

namespace AverroesProject;

class EditorialNote {
    
    /**
     *
     * @var int
     */
    public $id = 0;
    
    /**
     *
     * @var int
     */
    public $type;
    
    const OFFLINE = 1;
    const INLINE = 2;
    
    
    /**
     *
     * @var int
     */
    public $target = 0;
    /**
     *
     * @var int
     */
    public $authorId = 0;
    
    /**
     *
     * @var string
     */
    public $text = '';
    
    /**
     *
     * @var string(datetime)
     */
    public $time = '';
    
    /**
     *
     * @var string
     */
    public $lang = 'en';
    
    public function __construct() {
        $this->type = self::INLINE;
    }
    
    
    public static function constructEdNoteFromRow($theRow) 
    {
        
        $en = new EditorialNote();
        
        if (!isset($theRow['type'])) {
            return false;
        }
        $type = (int) $theRow['type'];
        if (!$en->isGivenTypeValid($type)) {
            return false;
        }
        $en->setType($type);
        if (isset($theRow['id'])) {
            $en->id = (int) $theRow['id'];
        }
        if (isset($theRow['author_id'])) {
            $en->authorId = (int) $theRow['author_id'];    
        }
        if (isset($theRow['lang'])) {
            $en->lang =  (string) $theRow['lang'];
        }
        if (isset($theRow['target'])) {
            $en->target =  (int) $theRow['target'];
        }
        if (isset($theRow['time'])) {
            $en->time =  (string) $theRow['time'];
        }
        if (isset($theRow['text'])) {
            $en->setText($theRow['text']);
        }

        return $en;
    }
    
    public static function constructEdNoteFromArray($theArray) 
    {
        $en = new EditorialNote();
        
        if (!isset($theArray['type'])) {
            return false;
        }
        $type = (int) $theArray['type'];
        if (!$en->isGivenTypeValid($type)) {
            return false;
        }
        $en->setType($type);
        if (isset($theArray['id'])) {
            $en->id = (int) $theArray['id'];
        }
        if (isset($theArray['authorId'])) {
            $en->authorId = (int) $theArray['authorId'];    
        }
        if (isset($theArray['lang'])) {
            $en->lang =  (string) $theArray['lang'];
        }
        if (isset($theArray['target'])) {
            $en->target =  (int) $theArray['target'];
        }
        if (isset($theArray['time'])) {
            $en->time =  (string) $theArray['time'];
        }
        if (isset($theArray['text'])) {
            $en->setText($theArray['text']);
        }

        return $en;
    }

    /**
     * Normalizes a string according to rules for textual items:
     *   - trims all whitespace at the beginning and end of the string
     *   - converts all whitespace inside the string to a single space
     *
     * @param string $str
     * @return string|string[]|null
     */
    private function normalizeString(string $str)
    {
        return preg_replace('/\s+/', ' ', trim($str));
    }
    
    public function setText(string $text) 
    {
        $this->text = $this->normalizeString($text);
    }
    
    public function setType($type) 
    {
        if ($this->isGivenTypeValid($type)) {
            $this->type = $type;
        }
    }
    
    private function isGivenTypeValid($type) 
    {
        return $type === self::OFFLINE || $type === self::INLINE;
    }
}
