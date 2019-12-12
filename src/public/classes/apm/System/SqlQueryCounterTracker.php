<?php
/* 
 *  Copyright (C) 2019 Universität zu Köln
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

namespace APM\System;


use ThomasInstitut\Profiler\AggregateCounterTracker;

class SqlQueryCounterTracker extends AggregateCounterTracker
{
    const SELECT_COUNTER = 'select';
    const CREATE_COUNTER = 'create';
    const DELETE_COUNTER = 'delete';
    const UPDATE_COUNTER = 'update';
    const OTHER_COUNTER = 'other';

    const ERROR_REGISTERING_COUNTERS_NOT_ALLOWED = 1000;

    public function __construct()
    {
        parent::__construct();
        parent::registerCounter(self::SELECT_COUNTER);
        parent::registerCounter(self::CREATE_COUNTER);
        parent::registerCounter(self::DELETE_COUNTER);
        parent::registerCounter(self::UPDATE_COUNTER);
        parent::registerCounter(self::OTHER_COUNTER);
    }

    public function registerCounter(string $counterName, int $initialValue = 0)
    {
        // do nothing!
        $this->throwRunTimeException("Registering counters not allowed", self::ERROR_REGISTERING_COUNTERS_NOT_ALLOWED);
    }

}