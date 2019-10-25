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

use APM\Core\Algorithm\BoundaryDetector;

/**
 * Range class test
 *  
 * As of 2018-10-02, just testing what's needed for 100% coverage
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class BoundaryDetectorTest extends TestCase {
    
   
    public function testBasic() {
        $bd = new BoundaryDetector();
       
        $isEmptyFunc = function ($e) { return is_null($e);};
        $getValueFunc = function ($e) { return $e; };
        
        $testCases = [
            [
                'name' => 'Empty', 
                'initialValue' => 0,
                'nextValue' => 0,
                'testArray' => [], 
                'expectedEdges' => [],
                'expectedBoundaries' => []
            ],
            [
                'name' => 'One edge, one boundary',
                'initialValue' => 1,
                'nextValue' => 2,
                'testArray' => [1,1,2,2],
                'expectedEdges' => [2],
                'expectedBoundaries' => [1],
            ],
            [
                'name' => 'One edge, two boundaries',
                'initialValue' => 1,
                'nextValue' => 3,
                'testArray' => [1,1,2,2],
                'expectedEdges' => [2],
                'expectedBoundaries' => [1,3],
            ],
            [
                'name' => 'Two edges, one boundary',
                'initialValue' => 0,
                'nextValue' => 2,
                'testArray' => [1,1,2,2],
                'expectedEdges' => [0,2],
                'expectedBoundaries' => [1]
            ],
            [
                'name' => 'Two edges, two boundaries',
                'initialValue' => 0,
                'nextValue' => 3,
                'testArray' => [1,1,2,2],
                'expectedEdges' => [0,2],
                'expectedBoundaries' => [1,3]
            ],
            [
                'name' => 'Empty values at the beginning',
                'initialValue' => 0,
                'nextValue' => 3,
                'testArray' => [null, null, 1,1,2,2],
                'expectedEdges' => [2,4],
                'expectedBoundaries' => [3,5]
            ],
            [
                'name' => 'Empty values at the end',
                'initialValue' => 0,
                'nextValue' => 3,
                'testArray' => [1,1,2,2, null, null, null],
                'expectedEdges' => [0,2],
                'expectedBoundaries' => [1,3]
            ],
            
        ];
        
        foreach($testCases as $testCase) {
            $edges = $bd->findEdges($testCase['testArray'], $getValueFunc, $isEmptyFunc, $testCase['initialValue']);
            $boundaries = $bd->findBoundaries($testCase['testArray'], $getValueFunc, $isEmptyFunc, $testCase['nextValue']);
            $this->assertEquals($testCase['expectedEdges'], $edges, $testCase['name']);
            $this->assertEquals($testCase['expectedBoundaries'], $boundaries, $testCase['name']);
        }
    }
    
    
    
}
