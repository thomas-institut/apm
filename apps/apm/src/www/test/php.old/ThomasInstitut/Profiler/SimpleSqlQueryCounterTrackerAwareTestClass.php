<?php


namespace Test\ThomasInstitut\Profiler;


use ThomasInstitut\Profiler\SimpleSqlQueryCounterTrackerAware;

class SimpleSqlQueryCounterTrackerAwareTestClass
{
    use SimpleSqlQueryCounterTrackerAware;

    public function __construct()
    {
        $this->initSqlQueryCounterTracker();
    }
}