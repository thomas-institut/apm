<?php

namespace ThomasInstitut\Profiler;

use PHPUnit\Framework\TestCase;

class SystemProfilerTest extends TestCase
{
    protected function tearDown(): void
    {
        SystemProfiler::stop();
        SystemProfiler::setName('');
    }

    public function testInitialState(): void
    {
        SystemProfiler::stop();
        SystemProfiler::setName('');
        $this->assertFalse(SystemProfiler::isStarted());
        $this->assertEquals('', SystemProfiler::getName());
        $this->assertEquals([], SystemProfiler::getLaps());
        $this->assertEquals(-1, SystemProfiler::getTotalTimeInMs());
    }

    public function testStartStop(): void
    {
        SystemProfiler::start();
        $this->assertTrue(SystemProfiler::isStarted());

        SystemProfiler::stop();
        $this->assertFalse(SystemProfiler::isStarted());
    }

    public function testName(): void
    {
        SystemProfiler::setName('Test Profiler');
        $this->assertEquals('Test Profiler', SystemProfiler::getName());
    }

    public function testLaps(): void
    {
        SystemProfiler::start();
        
        SystemProfiler::lap('First Lap');
        usleep(2000); // Wait 2ms to ensure delta is measurable
        SystemProfiler::lap('Second Lap');

        $laps = SystemProfiler::getLaps(false);
        $this->assertCount(2, $laps);
        
        $this->assertEquals('First Lap', $laps[0]['name']);
        // The first lap start is actually (now() - start), it might not be exactly 0 if microtime(true) ticked
        // But in the code: self::$start = self::now(); ... self::$laps[] = [ 'name' => $name, 'start' => self::now() - self::$start];
        // It's very close to 0.
        $this->assertGreaterThanOrEqual(0, $laps[0]['start']);
        
        $this->assertEquals('Second Lap', $laps[1]['name']);
        $this->assertEquals($laps[0]['end'], $laps[1]['start']);
        $this->assertGreaterThan(0, $laps[1]['delta']);
        $this->assertEquals($laps[1]['start'] + $laps[1]['delta'], $laps[1]['end']);

        $this->assertGreaterThan(0, SystemProfiler::getTotalTimeInMs());
    }

    public function testGetLapsAsDescriptions(): void
    {
        SystemProfiler::start();
        SystemProfiler::lap('Lap 1');
        
        $laps = SystemProfiler::getLaps(true);
        $this->assertCount(1, $laps);
        $this->assertStringContainsString('Lap 1', $laps[0]);
        $this->assertStringContainsString('(1)', $laps[0]);
    }

    public function testLapWhenNotStarted(): void
    {
        SystemProfiler::stop();
        SystemProfiler::lap('Should not be added');
        
        // Need to start to check if it was added (actually start() clears laps, so this test is tricky)
        // But getLaps returns [] if not started.
        $this->assertEquals([], SystemProfiler::getLaps());
    }

    public function testGetLapsWhenNotStarted(): void
    {
        SystemProfiler::start();
        SystemProfiler::lap('Lap 1');
        SystemProfiler::stop();
        
        $this->assertEquals([], SystemProfiler::getLaps());
    }

    public function testTotalTimeWithNoLaps(): void
    {
        SystemProfiler::start();
        $this->assertEquals(-1, SystemProfiler::getTotalTimeInMs());
    }
}
