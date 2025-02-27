<?php


namespace Test\ThomasInstitut\Profiler;


use PHPUnit\Framework\TestCase;
use ThomasInstitut\Profiler\SimpleSqlQueryCounterTrackerAware;
use ThomasInstitut\Profiler\SqlQueryCounterTracker;

class SqlCounterTrackerTest extends TestCase
{

    public function testSimple() {

        $tracker = new SqlQueryCounterTracker();

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

        $tracker->incrementCreate();
        $tracker->incrementDelete();
        $tracker->incrementSelect();
        $tracker->incrementUpdate();
        $tracker->incrementOther();

        $endValues = $tracker->end();

        foreach($endValues as $key => $value) {
            if ($key === 'Total') {
                $this->assertEquals(5, $value, "End Value for counter '" . $key . "'");
                continue;
            }
            $this->assertEquals(1, $value, "End Value for counter '" . $key . "'");
        }
    }
}