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
use APM\Core\Address\Point;
use APM\Core\Address\Address;

/**
 * Description of VectorTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class PointTest extends TestCase {
    
    public function testPointSimple() {
        
        $p1 = new Point();
        $this->assertTrue($p1->isUndefined());
        $this->assertTrue($p1->isNull());
        
        $this->assertNotEquals(0, $p1->getDimensionCount());
        $this->assertEquals(Address::UNDEFINED, $p1->getCoord(10));
        
        $p2 = new Point([10, 20]);
        $this->assertEquals(2, $p2->getDimensionCount());
        $this->assertEquals(10, $p2->getCoord(0));
        $this->assertEquals(20, $p2->getCoord(1));
        $this->assertEquals(Address::UNDEFINED, $p1->getCoord(3));
        $this->assertFalse($p2->isEqualTo(false));
        $this->assertFalse($p2->isEqualTo(1.232));
        $this->assertTrue($p2->isEqualTo(new Point([10,20])));
        $this->assertTrue($p2->isEqualTo([10,20]));
        
        $p3 = new Point(3);
        $p4 = new Point(4);
        $this->assertFalse($p3->isEqualTo($p4));
        $this->assertFalse($p4->isEqualTo($p3));
        
        $p5 = new Point([10, 21]);
        $this->assertFalse($p5->isEqualTo($p2));
        $p2->setCoord(1, 21);
        $this->assertTrue($p5->isEqualTo($p2));
        
        // non-existent coord
        $exceptionCaught = false;
        try {
            $p5->setCoord(10, 25);
        } catch (\OutOfBoundsException $ex) {
            $exceptionCaught = true;
        } 
        $this->assertTrue($exceptionCaught);
        
        $p6 = new Point([0,0]);
        $this->assertEquals(2, $p6->distanceTo(new Point([2,0])));
        $this->assertEquals(2, $p6->distanceTo(new Point([0,2])));
        $this->assertEquals(2*sqrt(2), $p6->distanceTo(new Point([2,2])));
        
        // incompatible points
        $exceptionCaught = false;
        try {
            $p6->distanceTo(new Point([1,2,3]));
        } catch (\InvalidArgumentException $ex) {
            $exceptionCaught = true;
        } 
        $this->assertTrue($exceptionCaught);
        
        // null point
        $exceptionCaught = false;
        try {
            $p6->distanceTo(new Point(2));
        } catch (\LogicException $ex) {
            $exceptionCaught = true;
        } 
        $this->assertTrue($exceptionCaught);
        
    }
    
    
}
