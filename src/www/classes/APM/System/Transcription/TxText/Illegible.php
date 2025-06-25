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
 * Description of TtiIllegible
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Illegible extends Item {
    
    public static array $validReasons = [
        'damaged', 
        'illegible'
    ];
    
    /**
     * 
     * @param int $id
     * @param int $s
     * @param string $length
     * @param string $reason
     */
    function __construct(int $id, int $s, string $length, $reason='illegible') {
        parent::__construct($id, $s);
        $this->type = parent::ILLEGIBLE;
        
        if ($length <= 0 ){
            throw new InvalidArgumentException("Transcription items of type ILLEGIBLE need a length > 0, length given: " . $length);
        }
        $this->length = (int) $length;
        
        if (!self::isReasonValid($reason)) {
            throw new InvalidArgumentException("Unrecognized reason for ILLEGIBLE item, reason given: " . $reason);
        }
        $this->extraInfo = $reason;
    }
    
    function getReason(): string
    {
        return $this->extraInfo;
    }
    
    function getText(): string
    {
        
        $unknownChar = 'ø';
        
        return str_repeat($unknownChar, $this->length);
    }
    
    function getLength(): int
    {
        return $this->length;
    }
    
    public static function isReasonValid($reason): bool
    {
        return in_array($reason, self::$validReasons);
    }
}
