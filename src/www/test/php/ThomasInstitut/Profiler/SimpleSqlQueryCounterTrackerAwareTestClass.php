<?php


namespace ThomasInstitut;


use ThomasInstitut\Profiler\SimpleSqlQueryCounterTrackerAware;

class SimpleSqlQueryCounterTrackerAwareTestClass
{
    use SimpleSqlQueryCounterTrackerAware;

    public function __construct()
    {
        $this->initSqlQueryCounterTracker();
    }
}