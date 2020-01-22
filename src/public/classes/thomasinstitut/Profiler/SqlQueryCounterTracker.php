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

namespace ThomasInstitut\Profiler;


/**
 * A counter tracker for Sql queries.
 *
 * Provides an aggregate counter with counter for basic SQL queries: SELECT, CREATE, DELETE, UPDATE and "other"
 *
 * @package APM\System
 */
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
        // block registering other counters!
        $this->throwRunTimeException("Registering counters not allowed", self::ERROR_REGISTERING_COUNTERS_NOT_ALLOWED);
    }

    /**
     * Increments the SELECT query counter
     */
    public function incrementSelect() : void {
        $this->increment(self::SELECT_COUNTER);
    }

    /**
     * Increments the CREATE query counter
     */
    public function incrementCreate() : void {
        $this->increment(self::CREATE_COUNTER);
    }

    /**
     * Increments the DELETE query counter
     */
    public function incrementDelete() : void {
        $this->increment(self::DELETE_COUNTER);
    }

    /**
     * Increments the UPDATE query counter
     */
    public function incrementUpdate() : void {
        $this->increment(self::UPDATE_COUNTER);
    }

    /**
     * Increments the 'other' query counter
     */
    public function incrementOther() : void {
        $this->increment(self::OTHER_COUNTER);
    }

}