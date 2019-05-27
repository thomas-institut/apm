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

use APM\Core\Person\Person;

/**
 * Simple representation of an editorial note: a text by an author with a given 
 * time.
 * 
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Note {
    
    /** @var Person */
    protected $author;
    const AUTHOR_UNDEFINED = false;
    
    /** @var string */
    protected $text;
    const TEXT_NOTEXT = '[empty]';
    
    /** @var int */
    protected $time;
    const TIME_NOW = -1;
    
    public function __construct($text = self::TEXT_NOTEXT, $author = self::AUTHOR_UNDEFINED, int $time = self::TIME_NOW) {
        $this->setAuthor($author);
        $this->setTime($time);
        $this->setText($text);
    }
    
    public function getText() {
        return $this->text;
    }
    
    public function setText($text) {
        if ($text === '') {
            throw new \InvalidArgumentException('Cannot set a Note\'s text to an empty string');
        }
        $this->text = $text;
    }
    
    public function getAuthor() {
        return $this->author;
    }
    
    public function setAuthor($author) {
        $this->author = $author;
    }
    
    public function getTime() : int {
        return $this->time;
    }
    
    public function setTime(int $time = self::TIME_NOW) {
        if ($time === self::TIME_NOW) {
            $time = time();
        }
        $this->time = $time;
    }
}
