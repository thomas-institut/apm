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
 * Simple integer range class
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class IntRange implements Range {
    
    /** @var int **/
    protected $start;
    /** @var int **/
    protected $length;
    
    public function __construct(int $start, int $length = 1) {
        if ($length < 1) {
            throw new \RangeException('Length cannot be less than 1');
        }
        $this->start = $start;
        $this->length = $length;
    }

    /**
     * Creates a Range object from a given start and end indexes.
     * 
     * The resulting range "includes" the end point. For example, 
     * a range from index 1 to index 2  will have start=1 and length=2
     * 
     * @param int $start
     * @param int $end
     * @return IntRange
     * @throws \RangeException
     */
    static public function RangeFromStartEnd(int $start, int $end) {
        if ($end < $start) {
            throw new \RangeException('End cannot be less than Start');
        }
        return new IntRange($start, $end-$start+1);
    }

    /**
     * Utility factory method, same as normal constructor
     * @param int $start
     * @param int $length
     * @return IntRange
     */
    static public function RangeFromStartLength(int $start, int $length): IntRange
    {
        return new IntRange($start, $length);
    }
    
    public function getLength(): int
    {
        return $this->length;
    }
    
    public function getStart(): int
    {
        return $this->start;
    }
    
    public function getEnd(): int
    {
        return $this->start + $this->length - 1;
    }
    
}
