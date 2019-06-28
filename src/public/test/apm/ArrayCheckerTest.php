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

use APM\ArrayChecker\ArrayChecker;
use PHPUnit\Framework\TestCase;


require "../vendor/autoload.php";

class ArrayCheckerTest extends TestCase
{

    public function testSimple() {

        $checker = new ArrayChecker();

        $this->assertTrue($checker->isArrayValid([], []));
        $this->assertTrue($checker->isArrayValid([1, 2, 3], []));

        // bad rules 1
        $exceptionRaised = false;
        try {
            $checker->isArrayValid([], ['requiredFields' => 'test']);
        } catch (\InvalidArgumentException $e) {
            $exceptionRaised = true;
        }
        $this->assertTrue($exceptionRaised);

        // bad rules 2
        $exceptionRaised = false;
        try {
            $checker->isArrayValid([], ['requiredFields' => [ 1, 2, 3]]);
        } catch (\InvalidArgumentException $e) {
            $exceptionRaised = true;
        }
        $this->assertTrue($exceptionRaised);

        $testCases = [
            [
                'name' => 'Missing req field 1',
                'arrayToTest' => [1,2,3],
                'rules' => ['requiredFields' => [ 'reqField']],
                'expectedError' => ArrayChecker::ERROR_MISSING_REQUIRED_FIELD
            ],
            [
                'name' => 'Missing req field 2',
                'arrayToTest' => ['f1' => 'test'],
                'rules' => ['requiredFields' => [ 'reqField']],
                'expectedError' => ArrayChecker::ERROR_MISSING_REQUIRED_FIELD
            ],
            [
                'name' => 'Wrong type, string',
                'arrayToTest' => ['f1' => 1],
                'rules' => [ 'requiredFields' => [ [ 'name' => 'f1', 'requiredType' => 'string']]],
                'expectedError' => ArrayChecker::ERROR_WRONG_FIELD_TYPE
            ],
            [
                'name' => 'Wrong type, int',
                'arrayToTest' => ['f1' => 'somestring'],
                'rules' => [ 'requiredFields' => [ [ 'name' => 'f1', 'requiredType' => 'int']]],
                'expectedError' => ArrayChecker::ERROR_WRONG_FIELD_TYPE
            ],
            [
                'name' => 'Wrong type, integer',
                'arrayToTest' => ['f1' => 'somestring'],
                'rules' => [ 'requiredFields' => [ [ 'name' => 'f1', 'requiredType' => 'integer']]],
                'expectedError' => ArrayChecker::ERROR_WRONG_FIELD_TYPE
            ],
            [
                'name' => 'Wrong type, bool',
                'arrayToTest' => ['f1' => 'somestring'],
                'rules' => [ 'requiredFields' => [ [ 'name' => 'f1', 'requiredType' => 'bool']]],
                'expectedError' => ArrayChecker::ERROR_WRONG_FIELD_TYPE
            ],
            [
                'name' => 'Wrong type, boolean',
                'arrayToTest' => ['f1' => 'somestring'],
                'rules' => [ 'requiredFields' => [ [ 'name' => 'f1', 'requiredType' => 'boolean']]],
                'expectedError' => ArrayChecker::ERROR_WRONG_FIELD_TYPE
            ],
            [
                'name' => 'Wrong type, float',
                'arrayToTest' => ['f1' => 'somestring'],
                'rules' => [ 'requiredFields' => [ [ 'name' => 'f1', 'requiredType' => 'float']]],
                'expectedError' => ArrayChecker::ERROR_WRONG_FIELD_TYPE
            ],
            [
                'name' => 'Wrong type, double',
                'arrayToTest' => ['f1' => 'somestring'],
                'rules' => [ 'requiredFields' => [ [ 'name' => 'f1', 'requiredType' => 'double']]],
                'expectedError' => ArrayChecker::ERROR_WRONG_FIELD_TYPE
            ],
            [
                'name' => 'Wrong type, array',
                'arrayToTest' => ['f1' => 'somestring'],
                'rules' => [ 'requiredFields' => [ [ 'name' => 'f1', 'requiredType' => 'array']]],
                'expectedError' => ArrayChecker::ERROR_WRONG_FIELD_TYPE
            ]
        ];


        foreach($testCases as $testCase) {
            $this->assertFalse($checker->isArrayValid($testCase['arrayToTest'], $testCase['rules']), $testCase['name']);
            $this->assertEquals($testCase['expectedError'], $checker->getErrorCode(), $testCase['name']);
            $this->assertNotEquals('', $checker->getErrorMessage(), $testCase['name']);
            //print $testCase['name'] . ': ' . $checker->getErrorMessage() . "\n";
        }

        // test cases again, now inside an array
        foreach($testCases as $testCase) {
            $this->assertFalse($checker->isArrayValid(
                ['myArray' => $testCase['arrayToTest']],
                ['requiredFields' => [
                    ['name' => 'myArray', 'requiredType' => 'array', 'arrayRules' => $testCase['rules']]
                ]]),
                'In array ' . $testCase['name']);
            $this->assertEquals($testCase['expectedError'], $checker->getErrorCode(), 'In array ' . $testCase['name']);
            $this->assertNotEquals('', $checker->getErrorMessage(), 'In array '. $testCase['name']);
            //print 'In array ' . $testCase['name'] . '::: ' . $checker->getErrorMessage() . "\n";
        }

        // Good types!
        $this->assertTrue($checker->isArrayValid(
            [
                'stringField' => 'somestring',
                'intField' => 25,
                'intField2' => 35,
                'boolField' => true,
                'boolField2' => false,
                'floatField' => 3.14159,
                'floatField2' => 2.71828,
                'arrayField' => []
            ],
            [ 'requiredFields' => [
                [ 'name' => 'stringField', 'requiredType' => 'string'],
                [ 'name' => 'intField', 'requiredType' => 'int'],
                [ 'name' => 'intField2', 'requiredType' => 'integer'],
                [ 'name' => 'boolField', 'requiredType' => 'bool'],
                [ 'name' => 'boolField2', 'requiredType' => 'boolean'],
                [ 'name' => 'floatField', 'requiredType' => 'float'],
                [ 'name' => 'floatField2', 'requiredType' => 'double'],
                [ 'name' => 'arrayField', 'requiredType' => 'array']
            ]
            ]));
        $this->assertEquals(ArrayChecker::ERROR_NO_ERROR, $checker->getErrorCode());
        $this->assertEquals('', $checker->getErrorMessage());
    }
}