<?php
/* 
 *  Copyright (C) 2016-2020 Universität zu Köln
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

namespace APM\Test\ToolBox;


use APM\ToolBox\ArraySort;
use PHPUnit\Framework\TestCase;



class ArraySortTest extends TestCase
{

    public function testSimple() {

        $testKey = 'myKey';
        $extraKey1 = 'someOtherKey';
        $extraKey2 = 'yetAnotherKey';

        $sortedArrays = [
            [],
            [ 'a', 'b', 'c', 'd', 'ed' , 'ef'],
            [ 1, 2, 3, 4, 5],
            [ [0, 1], [0, 2], [0, 3], [0, 4]],
            [ new SomeClass(1,2,3), new SomeClass(1, 2, 4), new SomeClass(1, 2, 5)]
        ];

        foreach($sortedArrays as $nTestCase => $theArray) {
            // copy the array
            $clone = [];
            foreach($theArray as $element) {
                $clone[] = $element;
            }
            shuffle($clone);

            $arrayToSort = [];
            foreach($clone as $nElement => $element) {
                $arrayToSort[] = [
                    $testKey => $element,
                    $extraKey1 => "Extra $nTestCase :  $nElement",
                    $extraKey2 => $nTestCase * 1000 + $nElement
                ];
            }

            ArraySort::byKey($arrayToSort, $testKey);

            foreach($arrayToSort as $i => $element) {
                $this->assertEquals($theArray[$i], $element[$testKey], "Test case $nTestCase, element $i");
            }
        }
    }

    public function testClass() {

        $sortedArray = [ 1, 2, 3, 4, 5, 24, 150, 187, 187, 290];

        // copy the array
        $clone = [];
        foreach($sortedArray as $element) {
            $clone[] = $element;
        }
        shuffle($clone);

        $arrayToSort = [];
        foreach($clone as $element) {
            $arrayToSort[] = new SomeClass(1, 2, $element);
        }

        ArraySort::byKey($arrayToSort, 'c');

        foreach($arrayToSort as $i => $element) {
            $this->assertEquals($sortedArray[$i], $element->c);
        }


    }

}