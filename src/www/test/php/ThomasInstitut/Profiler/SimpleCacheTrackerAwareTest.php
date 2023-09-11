<?php

namespace Test\ThomasInstitut\Profiler;

use PHPUnit\Framework\TestCase;
use ThomasInstitut\Profiler\CacheTracker;
use ThomasInstitut\Profiler\SqlQueryCounterTracker;

require 'SimpleCacheTrackerAwareTestClass.php';

class SimpleCacheTrackerAwareTest extends TestCase
{

    public function testSimple() {

        $object = new SimpleCacheTrackerAwareTestClass();

        $tracker = $object->getCacheTracker();

        $tracker->start();

        $tracker->incrementHits();
        $endValues = $tracker->end();

        $this->assertEquals(1, $endValues['Total']);
        $this->assertEquals(1, $endValues[CacheTracker::CACHE_HIT_COUNTER]);

    }

}