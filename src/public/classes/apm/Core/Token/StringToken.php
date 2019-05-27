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

namespace APM\Core\Token;

use APM\Core\Address\IntRange;
/**
 * A Token that is part of a string.
 * 
 * StringToken stores information about the position of its text within the
 * source string: character and line ranges.
 * 
 * The helper class StringTokenizer provides a method to convert a string
 * into an array of StringTokens.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class StringToken extends Token {
    
    /** @var IntRange */
    private $charRange;
    
    /** @var IntRange */
    private $lineRange;
    
    
    public function __construct(int $type, string $t, int $startCharIndex, 
            int $startLineNumber, int $endLineNumber = -1) {
        parent::__construct($type, $t);
        $this->charRange = new IntRange($startCharIndex, mb_strlen($t));
        if ($endLineNumber === -1 || $endLineNumber < $startLineNumber) {
            $endLineNumber = $startLineNumber;
        }
        $this->lineRange = 
                IntRange::RangeFromStartEnd($startLineNumber, $endLineNumber);
    }
    
    public function getCharRange() {
        return $this->charRange;
    }

    public function setCharRange(IntRange $r) {
        $this->charRange = $r;
    }

    public function getLineRange() {
        return $this->lineRange;
    }
    
    public function setLineRange(IntRange $r) {
        $this->lineRange = $r;
    }
    
    public function getLineNumber() {
        return $this->lineRange->getStart();
    }
   
}
