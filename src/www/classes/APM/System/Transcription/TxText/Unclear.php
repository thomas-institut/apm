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
 * Description of TtiUnclear
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Unclear extends Item {
    
    /**
     * 
     * @param int $id
     * @param int $s
     * @param string $reason
     * @param string $firstReading
     * @param string $altReading
     */
    function __construct($id, $s, $reason, $firstReading, $altReading='') {
        parent::__construct($id, $s);
        $this->type = parent::UNCLEAR;
        $this->extraInfo = match ($reason) {
            'unclear', 'damaged' => $reason,
            default => throw new InvalidArgumentException("Unrecognized reason for UNCLEAR item, reason given: " . $reason),
        };
        if ($firstReading === NULL or $firstReading === ''){
            throw new InvalidArgumentException("Transcription items of type UNCLEAR need at least one reading, use ILLEGIBLE");
        }
        $this->theText = $firstReading;
        $this->altText = $altReading;
    }
    
    function getReason(){
        return $this->extraInfo;
    }
    
}