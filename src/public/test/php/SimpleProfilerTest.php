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

namespace ThomasInstitut;

use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use RuntimeException;
use ThomasInstitut\Profiler\CounterTracker;
use ThomasInstitut\Profiler\iProfiler;
use ThomasInstitut\Profiler\SimpleProfiler;
use ThomasInstitut\Profiler\TimeTracker;

class SimpleProfilerTest extends TestCase
{

    public function testSimpleProfiler() {

        $numLoops = 10;
        $incValue = 2;
        $initialCounterValue = 150;

        $profiler = new SimpleProfiler();
        $counter = new CounterTracker(150);

        $profiler->registerProperty('time', new TimeTracker());
        $profiler->registerProperty('count', $counter);

        $exceptionCaught = false;
        try {
            $profiler->registerProperty(iProfiler::FIELD_LAP_NAME, new TimeTracker());
        } catch (InvalidArgumentException $e) {
            $exceptionCaught = true;
        }

        $this->assertTrue($exceptionCaught);
        $this->assertEquals(SimpleProfiler::ERROR_CANNOT_USE_RESERVED_LAP_NAME, $profiler->getErrorCode());

        $exceptionCaught = false;
        try {
            $profiler->registerProperty('time', new TimeTracker());
        } catch (InvalidArgumentException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);
        $this->assertEquals(SimpleProfiler::ERROR_PROPERTY_NAME_ALREADY_IN_USE, $profiler->getErrorCode());

        $exceptionCaught = false;
        try {
            $profiler->lap('someLap');
        } catch (RuntimeException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);
        $this->assertEquals(SimpleProfiler::ERROR_LAP_CALLED_WHEN_NOT_RUNNING, $profiler->getErrorCode());

        $exceptionCaught = false;
        try {
            $profiler->stop();
        } catch (RuntimeException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);
        $this->assertEquals(SimpleProfiler::ERROR_STOP_CALLED_WHEN_NOT_RUNNING, $profiler->getErrorCode());

        $profiler->start();

        $exceptionCaught = false;
        try {
            $profiler->start();
        } catch (RuntimeException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);
        $this->assertEquals(SimpleProfiler::ERROR_START_CALLED_WHEN_ALREADY_STARTED, $profiler->getErrorCode());

        $exceptionCaught = false;
        try {
            $profiler->getLaps();
        } catch (RuntimeException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);
        $this->assertEquals(SimpleProfiler::ERROR_GETLAPS_CALLED_WHEN_RUNNING, $profiler->getErrorCode());

        for ($i = 0; $i < $numLoops; $i++ ) {
            $counter->increment();
            $counter->add($incValue);
            $profiler->lap("Loop $i");

            $exceptionCaught = false;
            try {
                $profiler->lap("Loop $i");
            } catch (InvalidArgumentException $e) {
                $exceptionCaught = true;
            }

            $this->assertTrue($exceptionCaught);
            $this->assertEquals(SimpleProfiler::ERROR_LAP_NAME_ALREADY_IN_USE, $profiler->getErrorCode());

        }

        $exceptionCaught = false;
        try {
            $profiler->stop(iProfiler::DEFAULT_START_LAP_NAME);
        } catch (InvalidArgumentException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);
        $this->assertEquals(SimpleProfiler::ERROR_LAP_NAME_ALREADY_IN_USE, $profiler->getErrorCode());

        $profiler->stop();

        $laps = $profiler->getLaps();

        $this->assertCount($numLoops+2, $laps);

        $initialTime = $laps[0]['time'][iProfiler::FIELD_ABSOLUTE];
        for ($i = 0; $i < $numLoops; $i++) {
            $lapInfo = $laps[$i+1];
            $counterDelta = $incValue +1;
            $counterCummulative = $counterDelta * ($i+1);
            $this->assertEquals("Loop $i", $lapInfo[iProfiler::FIELD_LAP_NAME]);
            $this->assertEquals($counterDelta, $lapInfo['count'][iProfiler::FIELD_DELTA]);
            $this->assertEquals($counterCummulative, $lapInfo['count'][iProfiler::FIELD_CUMMULATIVE]);
            $this->assertEquals($counterCummulative + $initialCounterValue, $lapInfo['count'][iProfiler::FIELD_ABSOLUTE]);
            $this->assertGreaterThan($initialTime, $lapInfo['time'][iProfiler::FIELD_ABSOLUTE]);

        }




    }

}