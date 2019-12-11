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
use RuntimeException;
use ThomasInstitut\ErrorReporter\iErrorReporter;
use ThomasInstitut\ErrorReporter\SimpleErrorReporterTrait;

class SimpleProfiler implements iProfiler, iErrorReporter
{

    use SimpleErrorReporterTrait;

    const ERROR_CANNOT_USE_RESERVED_LAP_NAME = 100;
    const ERROR_START_CALLED_WHEN_ALREADY_STARTED = 101;
    const ERROR_PROPERTY_NAME_ALREADY_IN_USE = 102;
    const ERROR_LAP_NAME_ALREADY_IN_USE = 103;
    const ERROR_LAP_CALLED_WHEN_NOT_RUNNING = 104;
    const ERROR_STOP_CALLED_WHEN_NOT_RUNNING = 105;
    const ERROR_GETLAPS_CALLED_WHEN_RUNNING = 106;


    /**
     * @var array
     */
    private $propertyTrackers;
    /**
     * @var array
     */
    private $laps;
    /**
     * @var array
     */
    private $lapNames;
    /**
     * @var array
     */
    private $calculatedLaps;
    /**
     * @var bool
     */
    private $running;

    public function __construct()
    {
        $this->reset();
    }

    public function registerProperty(string $propertyName, iPropertyTracker $propertyTracker) : void
    {
        if ($propertyName === self::FIELD_LAP_NAME) {
            $this->setError("Cannot use reserved name $propertyName", self::ERROR_CANNOT_USE_RESERVED_LAP_NAME);
            throw new InvalidArgumentException($this->getErrorMessage(), $this->getErrorCode());
        }
        if (isset($this->propertyTrackers[$propertyName])) {
            $this->setError("Property name already in use", self::ERROR_PROPERTY_NAME_ALREADY_IN_USE);
            throw new InvalidArgumentException($this->getErrorMessage(), $this->getErrorCode());
        }
        $this->propertyTrackers[$propertyName] = $propertyTracker;
    }

    public function reset() : void {
        $this->propertyTrackers = [];
        $this->laps = [];
        $this->calculatedLaps = [];
        $this->running = false;
        $this->lapNames = [];
        $this->resetError();
    }

    public function start(string $startLapName = self::DEFAULT_START_LAP_NAME): void
    {
        $this->resetError();
        if ($this->isRunning()) {
            $this->setError("start() called when already started", self::ERROR_START_CALLED_WHEN_ALREADY_STARTED);
            throw new RuntimeException($this->getErrorMessage(), $this->getErrorCode());
        }
        $lapArray = [ self::FIELD_LAP_NAME => $startLapName];
        foreach($this->propertyTrackers as $propertyName => $propertyTracker) {
            /**@var $propertyTracker iPropertyTracker */
            $lapArray[$propertyName] = $propertyTracker->start();
        }
        $this->laps[] = $lapArray;
        $this->lapNames[] = $startLapName;
        $this->running = true;
    }

    public function lap(string $lapName): void
    {
        $this->resetError();

        if (array_search($lapName, $this->lapNames) !== false) {
            $this->setError("Lap name '$lapName' has been used already", self::ERROR_LAP_NAME_ALREADY_IN_USE);
            throw new InvalidArgumentException($this->getErrorMessage(), $this->getErrorCode());
        }


        if (!$this->isRunning()) {
            $this->setError("Lap() called when not running", self::ERROR_LAP_CALLED_WHEN_NOT_RUNNING);
            throw new RuntimeException($this->getErrorMessage(), $this->getErrorCode());
        }

        $lapArray = [ self::FIELD_LAP_NAME => $lapName];
        foreach($this->propertyTrackers as $propertyName => $propertyTracker) {
            /**@var $propertyTracker iPropertyTracker */
            $lapArray[$propertyName] = $propertyTracker->lap();
        }
        $this->laps[] = $lapArray;
        $this->lapNames[] = $lapName;
    }

    public function stop(string $stopLapName = self::DEFAULT_END_LAP_NAME): void
    {
        $this->resetError();

        if (array_search($stopLapName, $this->lapNames) !== false) {
            $this->setError("Lap name '$stopLapName' has been used already", self::ERROR_LAP_NAME_ALREADY_IN_USE);
            throw new InvalidArgumentException($this->getErrorMessage(), $this->getErrorCode());
        }
        if (!$this->isRunning()) {
            $this->setError("stop() called when not running", self::ERROR_STOP_CALLED_WHEN_NOT_RUNNING);
            throw new RuntimeException($this->getErrorMessage(), $this->getErrorCode());
        }
        $lapArray = [ self::FIELD_LAP_NAME => $stopLapName];
        foreach($this->propertyTrackers as $propertyName => $propertyTracker) {
            /**@var $propertyTracker iPropertyTracker */
            $lapArray[$propertyName] = $propertyTracker->end();
        }
        $this->laps[] = $lapArray;
        $this->lapNames[] = $stopLapName;
        $this->running = false;
    }

    public function getLaps(): array
    {
        $this->resetError();

        if ($this->isRunning()) {
            $this->setError("getLaps() called when still running", self::ERROR_GETLAPS_CALLED_WHEN_RUNNING);
            throw new RuntimeException($this->getErrorMessage(), $this->getErrorCode());
        }

        if ($this->calculatedLaps === []) {
            $this->calculateLaps();
        }
        return $this->calculatedLaps;
    }

    private function calculateLaps() : void {
        $calculatedLaps = [];
        foreach($this->lapNames as $i => $lapName) {
            $calculatedLaps[$i] = [ self::FIELD_LAP_NAME => $lapName ];
            foreach($this->propertyTrackers as $propertyName => $propertyTracker) {
                $calculatedLaps[$i][$propertyName][self::FIELD_ABSOLUTE]=  $this->getAbsoluteValue($i, $propertyName);
            }
        }

        foreach(array_keys($this->propertyTrackers) as $propertyName) {
            $initialValue = $this->getAbsoluteValue(0, $propertyName);
            $calculatedLaps[0][$propertyName][self::FIELD_CUMMULATIVE] = 0;
            $calculatedLaps[0][$propertyName][self::FIELD_DELTA] = 0;
            $previousValue = $initialValue;
            /** @var iPropertyTracker $tracker */
            $tracker = $this->propertyTrackers[$propertyName];
            for ($i = 1; $i < count($this->laps); $i++) {
                $currentValue = $this->getAbsoluteValue($i, $propertyName);
                $calculatedLaps[$i][$propertyName][self::FIELD_CUMMULATIVE] =
                    $tracker->difference($currentValue, $initialValue);
                $calculatedLaps[$i][$propertyName][self::FIELD_DELTA] =
                    $tracker->difference($currentValue, $previousValue);
                $previousValue = $currentValue;
            }
        }

        $this->calculatedLaps = $calculatedLaps;
    }

    private function getAbsoluteValue(int $lapIndex, string $propertyName) {
        return $this->laps[$lapIndex][$propertyName];
    }


    /**
     * @inheritDoc
     */
    public function isRunning(): bool
    {
        return $this->running;
    }
}