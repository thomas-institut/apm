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

use InvalidArgumentException;

/**
 * Description of TtiAddition
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Addition extends Item {
    
    public static array $validPlaces = [
        'above',
        'below',
        'inline',
        'inspace',
        'overflow',
        'margin left',
        'margin right', 
        'margin top', 
        'margin bottom'
    ];

    /**
     * 
     * @param int $id
     * @param int $s
     * @param string $text
     * @param string $place
     * @param int $target
     */
    function __construct(int $id, int $s, string $text, string $place, int $target=0) {
        parent::__construct($id, $s);
        $this->type = parent::ADDITION;
        if (!self::isPlaceValid($place)){
            throw new InvalidArgumentException("Unrecognized placement for ADDITION item, placement given: " . $place);
        }
        if ($text === ''){
            throw new InvalidArgumentException("Transcription items of type ADDITION need some text");
        }
        $this->theText = $text;
        $this->setTarget($target);
        $this->setPlace($place);
    }

    public static function isPlaceValid($place): bool
    {
        return in_array($place, self::$validPlaces);
    }
    
    public function setTarget($target): void
    {
        $this->target = $target;
    }
    
    public function getTarget(): int
    {
        return $this->target;
    }
    
    public function setPlace($place): void
    {
        $this->extraInfo = $place;
    }
    
    public function getPlace(): string
    {
        return $this->extraInfo;
    }
}