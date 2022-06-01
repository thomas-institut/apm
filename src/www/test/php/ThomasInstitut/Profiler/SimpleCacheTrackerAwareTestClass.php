<?php


namespace ThomasInstitut;


use ThomasInstitut\Profiler\SimpleCacheTrackerAware;

class SimpleCacheTrackerAwareTestClass {

    use SimpleCacheTrackerAware;

    public function __construct()
    {
        $this->initCacheTracker();
    }
}