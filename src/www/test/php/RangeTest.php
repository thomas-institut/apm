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

namespace APM;

require "autoload.php";

use PHPUnit\Framework\TestCase;

use APM\Core\Address\IntRange;
use APM\Core\Address\PointRange;
use APM\Core\Address\Point;


/**
 * Range class test
 *  
 * As of 2018-10-02, just testing what's needed for 100% coverage
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class RangeTest extends TestCase {
    
   
    
    public function testIntRange() {
        $range1 = new IntRange(10);
        $this->assertEquals(1, $range1->getLength());
        
        $range2 = new IntRange(10,5);
        $this->assertEquals(5, $range2->getLength());
        
        $exceptionRaised1 = false;
        try {
            $range3 = new IntRange(10,0);
        } catch (\RangeException $ex) {
            $exceptionRaised1 = true;
        }
        $this->assertTrue($exceptionRaised1);
        
        $range3 = IntRange::RangeFromStartEnd(1, 2);
        $this->assertEquals(1, $range1->getLength());
        
        $exceptionRaised2 = false;
        try {
            $range4 = IntRange::RangeFromStartEnd(1, 0);
        } catch (\RangeException $ex) {
            $exceptionRaised2 = true;
        }
        $this->assertTrue($exceptionRaised2);
        
        $range5 = IntRange::RangeFromStartLength(10, 5);
        $this->assertEquals($range2, $range5);
    }
    
    public function testPointRange() {
        
        // Simple test
        $p1 = new Point([0,0]);
        $p2 = new Point([1,1]);
        
        $pr = new PointRange($p1, $p2);
        $this->assertEquals($p1, $pr->getStart());
        $this->assertEquals($p2, $pr->getEnd());
        $this->assertEquals(sqrt(2), $pr->getLength());
        
        // Same, but constructing with arrays directly
        
        $pr2 = new PointRange([0,0], [1,1]);
        $this->assertEquals($p1, $pr2->getStart());
        $this->assertEquals($p2, $pr2->getEnd());
        $this->assertEquals(sqrt(2), $pr2->getLength());
        
        // Constructor calls
        $exceptionThrown = false;
        try {
            // bad first argument
            $p3 = new PointRange(1.23, $p1);
        } catch (\InvalidArgumentException $ex) {
            $exceptionThrown = true;
        }
        $this->assertTrue($exceptionThrown);
        
        $exceptionThrown = false;
        try {
            // bad second argument
            $p3 = new PointRange($p1, 'string');
        } catch (\InvalidArgumentException $ex) {
            $exceptionThrown = true;
        }
        $this->assertTrue($exceptionThrown);
        
        $p4 = new Point([1,2,3]);
        $exceptionThrown = false;
        try {
            // points of different number of dimensions
            $p3 = new PointRange($p1, $p4);
        } catch (\InvalidArgumentException $ex) {
            $exceptionThrown = true;
        }
        $this->assertTrue($exceptionThrown);
        
    }
    
}
