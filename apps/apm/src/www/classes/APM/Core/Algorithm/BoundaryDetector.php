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

namespace APM\Core\Algorithm;

/**
 * Helper class providing boundary detection algorithms
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class BoundaryDetector {
    
    /**
     * Returns an array with the indexes of the $things array in which
     * there is a change in the value given by the $getValueFunction ignoring
     * elements for which the $isEmptyFunction returns true. 
     *  
     * @param array $things
     * @param callable $getValueFunction  
     * @param callable $isEmptyFunction
     * @param $initialValue
     * @return array
     */
    public function findEdges(array $things, callable $getValueFunction, callable $isEmptyFunction, $initialValue = null) : array {
        $lastValue = $initialValue;
        $edges = [];
        for ($i = 0; $i < count($things); $i++) {
            if ($isEmptyFunction($things[$i])) {
                continue;
            }
            $currentValue = $getValueFunction($things[$i]);
            if ($currentValue !== $lastValue) {
                $edges[] = $i;
                $lastValue = $currentValue;
            }
        }
        return $edges;
    }
    
    /**
     * Returns the indexes of the elements of $things that are the last
     * element in a consecutive series of elements with the same value
     * given by the $getValueFunction, ignoring elements for which the 
     * $isEmptyFunction returns true.
     * 
     * @param array $things
     * @param callable $getValueFunction
     * @param callable $isEmptyFunction
     * @param $nextValue
     * @return array
     */
    public function findBoundaries(array $things, callable $getValueFunction, callable $isEmptyFunction, $nextValue = null) : array {
        $edges = $this->findEdges($things, $getValueFunction, $isEmptyFunction);
        if ($edges === []) {
            return [];
        }
        
        $boundaries = [];
        foreach($edges as $edge) {
            // start with the index inmediately before the edge
            $boundary = $edge-1;
            // go back until the first index that does not fall 
            // on an empty element or until index < 0
            while ($boundary>=0 && $isEmptyFunction($things[$boundary])){
                $boundary--;
            }
            // if the boundary > 0, add it to the list
            if ($boundary >= 0) {
                $boundaries[] = $boundary;
            }
        }
        // check to see if the last index is also a boundary
        $lastIndex = count($things) -1;
        // first, find the last non-empty element
        while ($lastIndex >= 0 && $isEmptyFunction($things[$lastIndex])) {
            $lastIndex--;
        }
        if (!$isEmptyFunction($things[$lastIndex])) {
            $lastValue = $getValueFunction($things[$lastIndex]);
            if ($lastValue !== $nextValue) {
                $boundaries[] = $lastIndex;
            }
        }
        
        return $boundaries;
    }
    
}
