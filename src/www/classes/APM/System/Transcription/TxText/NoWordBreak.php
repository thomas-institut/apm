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
 * Description of TtiNoLinebreak
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class NoWordBreak extends Item {
    /**
     * 
     * @param int $id
     * @param int $s
     */
    function __construct($id, $s) {
        parent::__construct($id, $s);
        $this->type = parent::NO_WORD_BREAK;
    }
    
    function getText(){
        return '';
    }

}