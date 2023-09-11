<?php


namespace Test\ThomasInstitut\Profiler;


use ThomasInstitut\Profiler\SimpleCacheTrackerAware;

class SimpleCacheTrackerAwareTestClass {

    use SimpleCacheTrackerAware;

    public function __construct()
    {
        $this->initCacheTracker();
    }
}