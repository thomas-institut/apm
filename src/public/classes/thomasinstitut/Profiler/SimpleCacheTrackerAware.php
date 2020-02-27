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


trait SimpleCacheTrackerAware
{

    /**
     * @var CacheTracker
     */
    protected $cacheTracker;

    public function getCacheTracker() : CacheTracker {
        return $this->cacheTracker;
    }
    public function setCacheTracker(CacheTracker $tracker) : void {
        $this->cacheTracker = $tracker;
    }

    public function initCacheTracker() : void {
        $this->setCacheTracker(new CacheTracker());
    }
}