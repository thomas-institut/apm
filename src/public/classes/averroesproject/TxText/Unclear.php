<?php

/*
 * Copyright (C) 2017 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

namespace AverroesProject\TxText;

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
        switch($reason){
            case 'unclear':
            case 'damaged':
                $this->extraInfo = $reason;
                break;
            
            default:
                throw new \InvalidArgumentException("Unrecognized reason for UNCLEAR item, reason given: " . $reason);
        }
        if ($firstReading === NULL or $firstReading === ''){
            throw new \InvalidArgumentException("Transcription items of type UNCLEAR need at least one reading, use ILLEGIBLE");
        }
        $this->theText = $firstReading;
        $this->altText = $altReading;
    }
    
    function getReason(){
        return $this->extraInfo;
    }
    
}