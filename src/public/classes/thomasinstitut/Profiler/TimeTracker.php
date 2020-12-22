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
 * Time tracker
 *
 * Takes a reading the current system micro-time time stamp
 *
 * @package ThomasInstitut\Profiler
 */
class TimeTracker implements PropertyTracker
{

    public function start(): float
    {
        return $this->getCurrentTimeStamp();
    }

    public function end(): float
    {
        return $this->getCurrentTimeStamp();
    }

    public function lap(): float
    {
        return $this->getCurrentTimeStamp();
    }

    private function getCurrentTimeStamp() : float {
        return microtime(true);
    }

    /**
     * @inheritDoc
     */
    public function difference($value1, $value2): float
    {
        return (float) $value1 - (float) $value2;
    }
}