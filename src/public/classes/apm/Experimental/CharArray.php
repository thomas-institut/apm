<?php

/*
 * Copyright (C) 2016-18 Universität zu Köln
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

namespace APM\Experimental;

/**
 * Description of CharArray
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class IntArray {
    
    const INT16 = 2;
    const INT32 = 4;
    const INT64 = 8;
    
    private $theString;
    private $length;
    
    /**
     * Size in bytes of every integer
     * @var int
     */
    private $intSize;
    
    public function __construct(int $intSize = self::INT16) {
        $this->theString = '';
        $this->intSize = $intSize;
        $this->length = 0;
    }
    
    public function push(int $someInteger) {
        $this->theString .= chr($char);
        $this->length++;
    }
    
    public function convertToString(int $someInteger) : string {
         
    }
}
