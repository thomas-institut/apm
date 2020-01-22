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
 * Interface Profiler
 *
 * A Profiler keeps track of a number of properties.
 *
 * The user can start and end the profiler, mark laps with names and get information about the marked
 * laps in absolute, cumulative and delta values
 *
 *
 * @package ThomasInstitut\Profiler
 */
interface Profiler
{
    const DEFAULT_START_LAP_NAME = 'Start';
    const DEFAULT_END_LAP_NAME = 'End';

    const FIELD_LAP_NAME = 'LapName';
    const FIELD_ABSOLUTE = 'absolute';
    const FIELD_CUMMULATIVE = 'cummulative';
    const FIELD_DELTA = 'delta';

    /**
     * Registers a property to use in the profiler.
     *
     * @param string $propertyName
     * @param PropertyTracker $propertyTracker
     * @return mixed
     */
    public function registerProperty(string $propertyName, PropertyTracker $propertyTracker) : void;

    /**
     * Start the profiler resetting all registered properties.
     * @param string $startLapName
     */
    public function start(string $startLapName = self::DEFAULT_START_LAP_NAME) : void;

    /**
     * Takes a snapshot of the registered properties and saves it with the given $lapName
     *
     * @param string $lapName
     */
    public function lap(string $lapName) : void;

    /**
     * Stop the profiler and all of its registered properties
     * @param string $stopLapName
     */
    public function stop(string $stopLapName = self::DEFAULT_END_LAP_NAME): void;

    /**
     * Returns detailed information about the marked laps. Including the start and end
     * of the profiler.
     *
     *  $returnedLapInfo = [
     *      [   'lapName' => 'Start',     // $returnedLapInfo[0]
     *          'propertyName1' => ['absolute' => absStartValueForP1, 'cumulative' => 0, 'delta' => 0 ]
     *          'propertyName2' => ['absolute' => absStartValueForP2, 'cumulative' => 0, 'delta' => 0 ],
     *          ...  // rest of properties
     *      ],
     *      [   'lapName => 'lapName1',   //  $returnedLapInfo[1]
     *          'propertyName1' => ['absolute' => absValueForP1atLap1, 'cumulative' => cumValueforP1, 'delta' => differenceFromPreviousLap ]
     *          'propertyName2' => ['absolute' => absValueForP1atLap1, 'cumulative' => cumValueforP2, 'delta' => differenceFromPreviousLap ]
     *          ... // rest of properties
     *      ],
     *
     *      ...   // rest of laps
     *
     *      [   'lapName => 'End',   //  $returnedLapInfo[n]
     *          'propertyName1' => ['absolute' => absValueForP1atLap1, 'cumulative' => cumValueforP1, 'delta' => differenceFromPreviousLap ]
     *          'propertyName2' => ['absolute' => absValueForP1atLap1, 'cumulative' => cumValueforP2, 'delta' => differenceFromPreviousLap ]
     *          ... // rest of properties
     *      ]
     * ]
     *
     *
     * @return array
     */
    public function getLaps() : array;

    /**
     * Returns true if the profiler is running (i.e. after a call to start() and before a call to stop()
     *
     * @return bool
     */
    public function isRunning() : bool;


}