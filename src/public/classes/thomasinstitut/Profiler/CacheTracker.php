<?php
/* 
 *  Copyright (C) 2020 Universität zu Köln
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

namespace ThomasInstitut\Profiler;


class CacheTracker extends AggregateCounterTracker
{
    const CACHE_HIT_COUNTER = 'hits';
    const CACHE_MISS_COUNTER = 'misses';
    const CACHE_DELETE_COUNTER = 'delete';
    const CACHE_CREATE_COUNTER = 'create';

    const ERROR_REGISTERING_COUNTERS_NOT_ALLOWED = 1000;

    public function __construct()
    {
        parent::__construct();
        parent::registerCounter(self::CACHE_HIT_COUNTER);
        parent::registerCounter(self::CACHE_MISS_COUNTER);
        parent::registerCounter(self::CACHE_DELETE_COUNTER);
        parent::registerCounter(self::CACHE_CREATE_COUNTER);
    }

    public function registerCounter(string $counterName, int $initialValue = 0)
    {
        // block registering other counters!
        $this->throwRunTimeException("Registering counters not allowed", self::ERROR_REGISTERING_COUNTERS_NOT_ALLOWED);
    }

    public function incrementHits() {
        $this->increment(self::CACHE_HIT_COUNTER);
    }

    public function incrementMisses() {
        $this->increment(self::CACHE_MISS_COUNTER);
    }

    public function incrementCreate() {
        $this->increment(self::CACHE_CREATE_COUNTER);
    }

    public function incrementDelete() {
        $this->increment(self::CACHE_DELETE_COUNTER);
    }


}