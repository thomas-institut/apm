<?php

namespace APM\Test\ToolBox;

use APM\ToolBox\DateTimeFormat;
use PHPUnit\Framework\TestCase;
use function PHPUnit\Framework\assertEquals;

class DateTimeFormatTest extends TestCase
{

    public function testGetHms() {

        $testCases = [
            [ 3821, [ 1, 3, 41]],
            [ 0, [ 0,0,0]],
            [ 23, [ 0, 0, 23]],
            [ 121, [ 0, 2, 1]],
            [ 90428, [ 25, 7, 8]]
            ];

        foreach ($testCases as $testCase) {
            [ $input, $expected ] = $testCase;
            assertEquals($expected, DateTimeFormat::getHoursMinutesSeconds($input), "Input $input");
        }
    }

    public function testTimeFormat() {
        $testCases = [
            [ 3821, '1:03:41'],
            [0, '0:00:00'],
            [ 23, '0:00:23'],
            [ 121, '0:02:01'],
            [ 90428, '25:07:08']
        ];
        foreach ($testCases as $testCase) {
            [ $input, $expected ] = $testCase;
            assertEquals($expected, DateTimeFormat::getFormattedTime($input), "Input $input");
        }

    }
}