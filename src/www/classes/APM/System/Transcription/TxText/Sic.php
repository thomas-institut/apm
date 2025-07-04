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
 * Description of TtiSic
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */

class Sic extends Item {
    /**
     *
     * @param int $id
     * @param int $s
     * @param string $theText
     * @param string $correction
     */
    function __construct(int $id, int $s, string $theText, string $correction='') {
        parent::__construct($id, $s);
        $this->type = parent::SIC;
        if ($theText ===''){
            throw new InvalidArgumentException("SIC items need non-empty text");
        }
        $this->theText = $theText;
        $this->altText = $correction;
    }

    function getCorrection(): string
    {
        return $this->altText;
    }
    
    public function getAltText(): string
    {
        return $this->getCorrection();
    }
    
    public function getPlainText(): string
    {
        return $this->getCorrection();
    }
}
