<?php


namespace ThomasInstitut;


use PHPUnit\Framework\TestCase;
use ThomasInstitut\Profiler\CacheTracker;
use ThomasInstitut\Profiler\SimpleSqlQueryCounterTrackerAware;
use ThomasInstitut\Profiler\SqlQueryCounterTracker;

class CacheTrackerTest extends TestCase
{

    public function testSimple() {

        $tracker = new CacheTracker();

        $exceptionCaught = false;
        try {
            $tracker->registerCounter('somename');
        } catch (\RuntimeException $e) {
            $exceptionCaught = true;
        }
        $this->assertTrue($exceptionCaught);

        $startValues = $tracker->start();

        foreach($startValues as $key => $value) {
            $this->assertEquals(0, $value, "Start Value for counter '" . $key . "'");
        }

        $tracker->incrementHits();
        $tracker->incrementMisses();
        $tracker->incrementDelete();
        $tracker->incrementCreate();

        $endValues = $tracker->end();

        foreach($endValues as $key => $value) {
            if ($key === 'Total') {
                $this->assertEquals(4, $value, "End Value for counter '" . $key . "'");
                continue;
            }
            $this->assertEquals(1, $value, "End Value for counter '" . $key . "'");
        }
    }
}