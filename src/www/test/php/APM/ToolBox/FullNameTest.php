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

namespace Test\APM\ToolBox;


use APM\ToolBox\FullName;
use PHPUnit\Framework\TestCase;

class FullNameTest extends TestCase
{
    public function testSimple() {


        $testCases = [
            [ 'fullName' => 'Jon Snow', 'shortName' => 'J. Snow', 'initials' => 'JS'],
            [ 'fullName' => 'Ludwig van Beethoven', 'shortName' => 'L. van Beethoven', 'initials' => 'LvB'],
            [ 'fullName' => 'Madonna', 'shortName' => 'Madonna', 'initials' => 'M'],

        ];

        foreach ($testCases as $testCase) {
            $fullName = $testCase['fullName'];
            $this->assertEquals($testCase['shortName'], FullName::getShortName($fullName), "Testing '$fullName' : short name");
            $this->assertEquals($testCase['initials'], FullName::getInitials($fullName), "Testing '$fullName' : initials");
        }
    }
}