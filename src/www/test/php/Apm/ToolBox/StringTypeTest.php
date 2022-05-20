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

namespace APM\Test;


use APM\ToolBox\StringType;
use PHPUnit\Framework\TestCase;

class StringTypeTest extends TestCase
{

    public function testIsPunctuation() {
        $testCases = [
            [ 'text'=> 'test', 'result' => false],
            [ 'text'=> 'test.', 'result' => false],
            [ 'text'=> '.', 'result' => true],
            [ 'text'=> ',;:', 'result' => true],
            [ 'text'=> '؟', 'result' => true], // Arabic
            [ 'text' => '־', 'result' => true], // Hebrew
            [ 'text' => ',;: ', 'result' => false]
        ];
        foreach($testCases as $testCase) {
            $this->assertEquals(
                $testCase['result'],
                StringType::isPunctuation($testCase['text']),
                "Testing '" . $testCase['text'] . "'");
        }
    }

    public function testHasPunctuation() {
        $testCases = [
            [ 'text'=> 'test', 'result' => false],
            [ 'text'=> 'test.', 'result' => true],
            [ 'text'=> '.', 'result' => true],
            [ 'text'=> ',;:', 'result' => true],
            [ 'text'=> '؟', 'result' => true], // Arabic
            [ 'text' => '־', 'result' => true], // Hebrew
            [ 'text' => ',;: ', 'result' => true]
        ];
        foreach($testCases as $testCase) {
            $this->assertEquals(
                $testCase['result'],
                StringType::hasPunctuation($testCase['text']),
                "Testing '" . $testCase['text'] . "'");
        }
    }

    public function testIsWhiteSpace() {
        $testCases = [
            [ 'text'=> 'test', 'result' => false],
            [ 'text'=> 'test.', 'result' => false],
            [ 'text'=> 'test ', 'result' => false],
            [ 'text'=> ' ', 'result' => true],
            [ 'text'=> "\t\t", 'result' => true],
            [ 'text'=> "\n", 'result' => true],
            [ 'text'=> " \n", 'result' => true],
            [ 'text'=> " .\n", 'result' => false],

        ];
        foreach($testCases as $testCase) {
            $this->assertEquals(
                $testCase['result'],
                StringType::isWhiteSpace($testCase['text']),
                "Testing '" . $testCase['text'] . "'");
        }
    }

    public function testHasWhiteSpace() {
        $testCases = [
            [ 'text'=> 'test', 'result' => false],
            [ 'text'=> 'test.', 'result' => false],
            [ 'text'=> 'test ', 'result' => true],
            [ 'text'=> ' ', 'result' => true],
            [ 'text'=> "\t\t", 'result' => true],
            [ 'text'=> "\n", 'result' => true],
            [ 'text'=> " \n", 'result' => true],
            [ 'text'=> " .\n", 'result' => true],

        ];
        foreach($testCases as $testCase) {
            $this->assertEquals(
                $testCase['result'],
                StringType::hasWhiteSpace($testCase['text']),
                "Testing '" . $testCase['text'] . "'");
        }
    }
}