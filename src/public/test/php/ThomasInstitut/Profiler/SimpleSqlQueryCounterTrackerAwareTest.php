<?php


namespace ThomasInstitut;

use PHPUnit\Framework\TestCase;
use ThomasInstitut\Profiler\SqlQueryCounterTracker;

require 'SimpleSqlQueryCounterTrackerAwareTestClass.php';

class SimpleSqlQueryCounterTrackerAwareTest extends TestCase
{

    public function testSimple() {

        $object = new SimpleSqlQueryCounterTrackerAwareTestClass();

        $tracker = $object->getSqlQueryCounterTracker();

        $tracker->start();

        $tracker->incrementSelect();
        $endValues = $tracker->end();

        $this->assertEquals(1, $endValues['Total']);
        $this->assertEquals(1, $endValues[SqlQueryCounterTracker::SELECT_COUNTER]);

    }

}