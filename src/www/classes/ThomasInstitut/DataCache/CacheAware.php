<?php
/* 
 *  Copyright (C) 2016-2020 Universität zu Köln
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

namespace ThomasInstitut\DataCache;


/**
 * Classes that implement this interface provide common functions
 * that allow clients to control caching in the class: use the cache or not, set the cache, tell whether
 * the case is in use or not.
 */
interface CacheAware
{
    /**
     * Starts using the cache
     * @return void
     */
    public function useCache() : void;

    /**
     * Stops using the cache
     * @return void
     */
    public function doNotUseCache() : void;

    /**
     * Sets the cache
     * @param DataCache $dataCache
     * @return void
     */
    public function setCache(DataCache $dataCache) : void;

    /**
     * Returns true if the cache is in use
     * @return bool
     */
    public function isCacheInUse() : bool;
}