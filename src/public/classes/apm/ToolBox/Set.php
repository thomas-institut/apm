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

namespace APM\ToolBox;

use ArrayIterator;
use IteratorAggregate;
use Traversable;

/**
 * Simple representation and basic functions related to finite sets
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Set implements IteratorAggregate {
    
    /**
     *
     * @var array
     */
    private array $elements;
    
    public function __construct(array $elementArray) {
        // keys in $elementArray are lost, the set's elements
        // array has consecutive numeric keys starting from 0
        $values = array_values($elementArray);
        
        // sort the values; this makes operations simpler
        // (and possibly faster)
        sort($values);
        
        // remove duplicates
        $this->elements = array_values(array_unique($values, SORT_REGULAR));
    }
    
    /**
     * 
     * @return array
     */
    public function enumerate() : array {
        return $this->elements;
    }
    
    public function cardinality() : int {
        return count($this->elements);
    }
    
    public function isEmpty() : bool {
        return $this->elements === [];
    }
    
    public function isEqualTo(Set $b) : bool {
        return self::isEqual($this, $b);
    }
    
    public function isSubsetOf(Set $b): bool
    {
        return self::isSubset($this, $b);
    }
    
    public function contains($value): bool
    {
        // Notice: strict comparison for the search
        return array_search($value, $this->elements, true) !== false;
    }
    
    // BASIC OPERATIONS (STATIC)
    
    static public function union(Set $a, Set $b) : Set {
        return new Set(array_merge($a->enumerate(), $b->enumerate()));
    }
    
    static public function intersection(Set $a, Set $b) : Set {
        // naive implementation
        $intersection = [];
        foreach($a as $aElement) {
            if ($b->contains($aElement)) {
                $intersection[] = $aElement;
            }
        }
        return new Set($intersection);
    }
    
    static public function isEqual(Set $a, Set $b): bool {
        // notice that this only works because the values in the inner array
        // are sorted. PHP equality operator compares keys and values, not
        // just values; only if the values in each array are ordered we
        // can be sure that in equal sets the values have the same keys
        return $a->enumerate() == $b->enumerate();
    }
    static public function isSubset(Set $a, Set $b) : bool {
        // fully traversing $a, not profiting from the 
        // fact that the values are sorted inside $a and $b
        foreach($a as $e) {
            if (!$b->contains($e)) {
                return false;
            }
        }
        return true;

        // using the definition of subset
        // this might be very inefficient!
        //return self::intersection($a, $b)->isEqualTo($a);
    }
    
    // FACTORY METHODS
    static public function createEmptySet() : Set {
        return new Set([]);
    }
    
    static public function createFromArray(array $elements) : Set {
        return new Set($elements);
    }

    // Iterator implementation
    public function getIterator(): Traversable {
        return new ArrayIterator($this->elements);
    }

}
