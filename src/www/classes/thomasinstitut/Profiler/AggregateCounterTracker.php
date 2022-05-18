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

use InvalidArgumentException;
use ThomasInstitut\ErrorReporter\ErrorReporter;
use ThomasInstitut\ErrorReporter\SimpleErrorReporterTrait;

/**
 * Class AggregateCounterTracker
 *
 * Aggregates a number of counters into a single property tracker.
 *
 * Individual counters are accessed by a unique string identifier.
 *
 * @package ThomasInstitut\Profiler
 */
class AggregateCounterTracker implements PropertyTracker, ErrorReporter
{
    use SimpleErrorReporterTrait;

    const TOTAL_TRACKER_NAME = 'Total';

    const ERROR_COUNTER_NAME_ALREADY_USED = 200;
    const ERROR_COUNTER_NOT_REGISTERED = 201;


    /**
     * @var CounterTracker[]
     */
    private array $counterTrackers;

    public function __construct()
    {
        $this->counterTrackers = [];
        $this->counterTrackers[self::TOTAL_TRACKER_NAME] =   new CounterTracker(0);
    }

    public function registerCounter(string $counterName, int $initialValue = 0) {
        if (isset($this->counterTrackers[$counterName])) {
            $this->setError("Counter name already used", self::ERROR_COUNTER_NAME_ALREADY_USED);
            throw new InvalidArgumentException($this->getErrorMessage(), $this->getErrorCode());
        }

        $this->counterTrackers[$counterName] = new CounterTracker($initialValue);
        $this->getTotalTracker()->reset($this->getTotalTracker()->getInitialValue() + $initialValue);
    }

    private function getTotalTracker() : CounterTracker {
        return $this->counterTrackers[self::TOTAL_TRACKER_NAME];
    }

    /**
     * @inheritDoc
     */
    public function start(): array
    {
        $values = [];
        foreach($this->counterTrackers as $name => $tracker) {
            $values[$name] = $tracker->start();
        }
        return $values;
    }

    /**
     * @inheritDoc
     */
    public function end(): array
    {
        $values = [];
        foreach($this->counterTrackers as $name => $tracker) {
            $values[$name] = $tracker->end();
        }
        return $values;
    }

    /**
     * @inheritDoc
     */
    public function lap(): array
    {
        $values = [];
        foreach($this->counterTrackers as $name => $tracker) {
            $values[$name] = $tracker->lap();
        }
        return $values;
    }

    /**
     * @inheritDoc
     */
    public function difference($value1, $value2): array
    {
        $diffValues = [];
        foreach($value1 as $name => $value) {
            $v2 = isset($value2[$name]) ? $value2[$name] : 0;
            $diffValues[$name] = $value - $v2;
        }
        return $diffValues;
    }

    public function increment(string $counterName)
    {
        if (!isset($this->counterTrackers[$counterName])) {
            $this->throwInvalidArgumentException("Counter $counterName not registered", self::ERROR_COUNTER_NOT_REGISTERED);
        }
        $this->counterTrackers[$counterName]->increment();
        $this->getTotalTracker()->increment();
    }

    public function add(string $counterName, int $value)
    {
        if (!isset($this->counterTrackers[$counterName])) {
            $this->throwInvalidArgumentException("Counter $counterName not registered", self::ERROR_COUNTER_NOT_REGISTERED);
        }
        $this->counterTrackers[$counterName]->add($value);
        $this->getTotalTracker()->add($value);
    }
}