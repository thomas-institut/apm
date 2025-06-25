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

use Exception;
use InvalidArgumentException;
use LogicException;

/**
 * The coordinates of a point in n-dimensional space
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Point extends Address {
    
    protected array $coords;
    
    public function __construct($param = 2) {
        $this->coords = [];
        if (is_int($param)) {
            // Integer parameter = vector cardinality
            $cardinality = $param;
            for ($i = 0; $i<$cardinality; $i++) {
                $this->coords[$i] = Address::UNDEFINED;
            }
            return;
        }
        if (is_array($param)) {
            // Array parameter => list of coordinates
            $coord = 0;
            foreach($param as $value) {
                $this->coords[$coord] = $value;
                $coord++;
            }
            return;
        }
        // Bad $param
        throw new \BadMethodCallException('Need int or array to construct Point');
    }
    
    public function getDimensionCount() : int {
        return count($this->coords);
    }
    
    public function getCoord(int $coord) {
        if (isset($this->coords[$coord])) {
            return $this->coords[$coord];
        }
        return Address::UNDEFINED;
    }
    
    public function setCoord(int $coord, $value): void
    {
        if (!array_key_exists($coord, $this->coords)) {
            throw new \OutOfBoundsException('Undefined coord ' . $coord);
        }
        $this->coords[$coord] = $value;
    }
    
    public function isEqualTo($param): bool {
        $vector2 = $param;
        if (!is_a($param, get_class($this))){
            // try to convert the parameter into a vector
            try {
                $vector2 = new Point($param);
            } catch (Exception) {
                // didn't work, give up
                return false;
            }
        }
        if ($this->getDimensionCount() !== $vector2->getDimensionCount()) {
            return false;
        }
        foreach ($this->coords as $coord => $value) {
            if ($this->getCoord($coord) !== $vector2->getCoord($coord)) {
                return false;
            }
        }
        return true;
    }
    
    public function distanceTo(Point $p2): float
    {
        if ($this->getDimensionCount() !== $p2->getDimensionCount()) {
            throw new InvalidArgumentException('given point must be of the same cardinality');
        }
        
        if ($this->isNull() || $p2->isNull()) {
            throw  new LogicException('One or both of the given points is null');
        }
        
        $squares = 0;
        for ($i = 0; $i < $this->getDimensionCount(); $i++) {
            $squares += pow($this->getCoord($i) - $p2->getCoord($i), 2);
        }
        return sqrt($squares);
    }

    public function isNull(): bool {
        foreach($this->coords as $coord) {
            if (!is_null($coord)) {
                return false;
            }
        }
        return true;
    }

}
