<?php

/*
 * Copyright (C) 2018 Universität zu Köln
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

namespace APM;

require "../vendor/autoload.php";

use PHPUnit\Framework\TestCase;
use APM\Math\Set;


/**
 * Description of SetTest
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class SetTest extends TestCase {
    
    public function testSimpleNumeric() {
       
       $s1 = Set::createEmptySet();
       
       $this->assertTrue($s1->isEmpty());
       
       $s2 = new Set([1,4,4,5,2]);
       $this->assertFalse($s2->isEmpty());
       $this->assertEquals(4, $s2->cardinality());
       $this->assertTrue($s2->contains(1));
       $this->assertFalse($s2->contains('1'));
       $this->assertFalse($s2->contains(25));
       
       $s3 = Set::createFromArray([1,5,4,2]);
       $this->assertFalse($s3->isEmpty());
       $this->assertEquals(4, $s3->cardinality());
       
       $s4 = new Set([1,2]);
       $this->assertFalse($s4->isEmpty());
       $this->assertEquals(2, $s4->cardinality());
       
       
       $this->assertFalse(Set::isEqual($s1, $s2));
       $this->assertTrue(Set::isEqual($s2, $s3));
       $this->assertTrue($s2->isEqualTo($s3));
       
       $this->assertFalse(Set::isEqual($s2, $s4));
       $this->assertFalse($s2->isEqualTo($s4));
       $this->assertFalse(Set::isEqual($s3, $s4));
       
       $this->assertTrue(Set::isSubset($s2, $s3));
       $this->assertTrue($s2->isSubsetOf($s3));
       $this->assertTrue(Set::isSubset($s3, $s2));
       
       $this->assertTrue(Set::isSubset($s4, $s3));
       $this->assertTrue(Set::isSubset($s4, $s2));
       
       $this->assertFalse(Set::isSubset($s2, $s4));
       $this->assertFalse(Set::isSubset($s3, $s4));
       
       $this->assertTrue(Set::union($s3, $s4)->isEqualTo($s3));
       $this->assertTrue(Set::union($s4, $s3)->isEqualTo($s3));
       
       // a simple iteration
       foreach($s2 as $element) {
           $this->assertTrue($element <= 5);
       }
    }
    
    public function testSimpleString() {
       
       $s1 = Set::createEmptySet();
       $this->assertTrue($s1->isEmpty());
       $this->assertEquals(0, $s1->cardinality());
       
       $s2 = new Set(['a','d','d','e','b']);
       $this->assertFalse($s2->isEmpty());
       $this->assertEquals(4, $s2->cardinality());
       $this->assertTrue($s2->contains('a'));
       $this->assertFalse($s2->contains(1));
       $this->assertFalse($s2->contains('f'));
       
       $s3 = new Set(['a','e','d','b']);
       $this->assertFalse($s3->isEmpty());
       $this->assertEquals(4, $s3->cardinality());
       
       $s4 = new Set(['a','b']);
       $this->assertFalse($s4->isEmpty());
       $this->assertEquals(2, $s4->cardinality());
       
       
       $this->assertFalse(Set::isEqual($s1, $s2));
       $this->assertTrue(Set::isEqual($s2, $s3));
       $this->assertTrue($s2->isEqualTo($s3));
       
       $this->assertFalse(Set::isEqual($s2, $s4));
       $this->assertFalse($s2->isEqualTo($s4));
       $this->assertFalse(Set::isEqual($s3, $s4));
       
       $this->assertTrue(Set::isSubset($s2, $s3));
       $this->assertTrue($s2->isSubsetOf($s3));
       $this->assertTrue(Set::isSubset($s3, $s2));
       
       $this->assertTrue(Set::isSubset($s4, $s3));
       $this->assertTrue(Set::isSubset($s4, $s2));
       
       $this->assertFalse(Set::isSubset($s2, $s4));
       $this->assertFalse(Set::isSubset($s3, $s4));
       
       $this->assertTrue(Set::union($s3, $s4)->isEqualTo($s3));
       $this->assertTrue(Set::union($s4, $s3)->isEqualTo($s3));
       
       // a simple iteration
       foreach($s2 as $element) {
           $this->assertTrue(is_string($element));
       }
    }
   
    
    public function testAssociativeArrays() {
        $s1 = Set::createEmptySet();
       
       $this->assertTrue($s1->isEmpty());
       
       $s2 = new Set(['a' => 1,4,4, 'c' => 5,2]);
       $this->assertFalse($s2->isEmpty());
       $this->assertEquals(4, $s2->cardinality());
       
       $s3 = new Set([1, 'a' => 5,4,'x' => 2]);
       $this->assertFalse($s3->isEmpty());
       $this->assertEquals(4, $s3->cardinality());
       
       $s4 = new Set(['x' => 1, 'y' => 2]);
       $this->assertFalse($s4->isEmpty());
       $this->assertEquals(2, $s4->cardinality());
       
       
       $this->assertFalse(Set::isEqual($s1, $s2));
       $this->assertTrue(Set::isEqual($s2, $s3));
       $this->assertTrue($s2->isEqualTo($s3));
       
       $this->assertFalse(Set::isEqual($s2, $s4));
       $this->assertFalse($s2->isEqualTo($s4));
       $this->assertFalse(Set::isEqual($s3, $s4));
       
       $this->assertTrue(Set::isSubset($s2, $s3));
       $this->assertTrue($s2->isSubsetOf($s3));
       $this->assertTrue(Set::isSubset($s3, $s2));
       
       $this->assertTrue(Set::isSubset($s4, $s3));
       $this->assertTrue(Set::isSubset($s4, $s2));
       
       $this->assertFalse(Set::isSubset($s2, $s4));
       $this->assertFalse(Set::isSubset($s3, $s4));
       
       $this->assertTrue(Set::union($s3, $s4)->isEqualTo($s3));
       $this->assertTrue(Set::union($s4, $s3)->isEqualTo($s3));
       
       // a simple iteration
       foreach($s2 as $element) {
           $this->assertTrue($element <= 5);
       }
    }
    
    public function testIntersections() {
        
        $a = new Set([1,2, 3, 4, 5]);
        
        $this->assertTrue(Set::intersection($a, Set::createFromArray([6, 7]))->isEmpty());
        
        $b = new Set(['1', '2']);
        $aIntB = Set::intersection($a, $b);
        $this->assertTrue($aIntB->isEmpty());
        $this->assertEquals([1, 2], Set::intersection($a, Set::createFromArray([1, 2, 6, 7]))->enumerate());
        
    }
   
    
}
