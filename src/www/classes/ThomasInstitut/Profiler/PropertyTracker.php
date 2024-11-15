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
 * Interface iPropertyTracker
 *
 * A PropertyTracker provides functions to track a property for a profiler.
 * It should provide methods for starting, lapping and ending tracking, as well as a method
 * for calculating the difference between two values.
 *
 * The property itself can be of any type.
 *
 * @package ThomasInstitut\Profiler
 */
interface PropertyTracker
{
    /**
     * @return mixed
     */
    public function start();

    /**
     * @return mixed
     */
    public function end();

    /**
     * @return mixed
     */
    public function lap();

    /**
     * @param $value1
     * @param $value2
     * @return mixed
     */
    public function difference($value1, $value2);

}