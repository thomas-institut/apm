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

namespace APM\Core\Address;

/**
 * Base class for addresses in the system, e.g. item addresses in pages
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class Address {
    const UNDEFINED = null;
        
    abstract public function getCoord(int $coord);
    abstract public function setCoord(int $coord, $value);
    abstract public function isNull() : bool;
    abstract public function isEqualTo($param) : bool;
    
    public function isUndefined(): bool {
        return $this->isNull();
    }
}
