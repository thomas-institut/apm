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

namespace Test\ThomasInstitut\Profiler;

use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use ThomasInstitut\Profiler\AggregateCounterTracker;

class AggregateCounterTrackerTest extends TestCase
{

    public function testTracker()
    {
        $tracker = new AggregateCounterTracker();

        $initialValues = [ 'apples' => 20, 'oranges' => 0, 'pears' => 0, 'strawberries' => 0];

        $fruitNames = array_keys($initialValues);

        $totalInitialValue = 0;
        foreach($initialValues as $fruitName => $initialValue) {
            $tracker->registerCounter($fruitName, $initialValue);
            $totalInitialValue += $initialValue;
        }

        $exceptionCaught = false;
        try {
            $tracker->registerCounter('apples');
        } catch (InvalidArgumentException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);
        $this->assertEquals(AggregateCounterTracker::ERROR_COUNTER_NAME_ALREADY_USED, $tracker->getErrorCode());

        $values = $tracker->start();
        foreach($fruitNames as $fruitName) {
            $this->assertTrue(isset($values[$fruitName]));
            $this->assertEquals($initialValues[$fruitName], $values[$fruitName]);
        }
        $this->assertEquals($totalInitialValue, $values[AggregateCounterTracker::TOTAL_TRACKER_NAME]);

        foreach($fruitNames as $fruitName) {
            $tracker->increment($fruitName);
            $tracker->add($fruitName, 2);
        }

        $exceptionCaught = false;
        try {
            $tracker->increment('bricks');
        } catch (InvalidArgumentException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);
        $this->assertEquals(AggregateCounterTracker::ERROR_COUNTER_NOT_REGISTERED, $tracker->getErrorCode());

        $exceptionCaught = false;
        try {
            $tracker->add('bricks', 10);
        } catch (InvalidArgumentException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);
        $this->assertEquals(AggregateCounterTracker::ERROR_COUNTER_NOT_REGISTERED, $tracker->getErrorCode());

        $valuesLap = $tracker->lap();
        $diffValues = $tracker->difference($valuesLap, $values);
        foreach($fruitNames as $fruitName) {
            $this->assertTrue(isset($valuesLap[$fruitName]));
            $this->assertEquals($initialValues[$fruitName] + 3, $valuesLap[$fruitName]);
            $this->assertEquals(3, $diffValues[$fruitName]);
        }
        $this->assertEquals($totalInitialValue + 3 * count($fruitNames), $valuesLap[AggregateCounterTracker::TOTAL_TRACKER_NAME]);
        $this->assertEquals(3 * count($fruitNames), $diffValues[AggregateCounterTracker::TOTAL_TRACKER_NAME]);

        $valuesEnd = $tracker->end();
        $diffValues = $tracker->difference($valuesEnd, $valuesLap);
        foreach($fruitNames as $fruitName) {
            $this->assertTrue(isset($valuesEnd[$fruitName]));
            $this->assertEquals($initialValues[$fruitName] + 3, $valuesEnd[$fruitName]);
            $this->assertEquals(0, $diffValues[$fruitName]);
        }

        $this->assertEquals($totalInitialValue + 3 * count($fruitNames), $valuesLap[AggregateCounterTracker::TOTAL_TRACKER_NAME]);
        $this->assertEquals(0, $diffValues[AggregateCounterTracker::TOTAL_TRACKER_NAME]);



    }

}