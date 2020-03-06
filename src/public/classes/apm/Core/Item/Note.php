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
use Cassandra\Time;
use InvalidArgumentException;
use ThomasInstitut\TimeString\TimeString;

/**
 * Simple representation of an editorial note: a text by an author with a given 
 * time.
 * 
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Note {

    const DEFAULT_TEXT = 'No text';
    const DEFAULT_AUTHOR_ID = -1;
    const DEFAULT_TIMESTAMP = TimeString::TIME_ZERO;

    /**
     * @var int
     */
    protected $authorId;

    /** @var string */
    protected $text;

    /** @var string */
    protected $time;

    
    public function __construct(string $text = self::DEFAULT_TEXT, int $authorId = self::DEFAULT_AUTHOR_ID, string $timeStamp = self::DEFAULT_TIMESTAMP) {
        $this->setAuthorId($authorId);
        $this->setTime($timeStamp);
        $this->setText($text);
    }
    
    public function getText() {
        return $this->text;
    }
    
    public function setText(string $text) : void {
        if ($text === '') {
            throw new InvalidArgumentException('Cannot set a Note\'s text to an empty string');
        }
        $this->text = $text;
    }
    
    public function getAuthorId() : int {
        return $this->authorId;
    }
    
    public function setAuthorId(int $authorId): void{
        $this->authorId = $authorId;
    }
    
    public function getTimestamp() : string {
        return $this->time;
    }
    
    public function setTime(string $timeStamp) : void{
        if (!TimeString::isValid($timeStamp)) {
            throw new InvalidArgumentException('Invalid time given');
        }
        $this->time = $timeStamp;
    }

    public function getData() : array {
        return [
            'authorId' => $this->getAuthorId(),
            'text' => $this->getText(),
            'timeStamp' => $this->getTimestamp()
        ];
    }
}
