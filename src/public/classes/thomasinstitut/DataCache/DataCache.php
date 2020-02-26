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

namespace ThomasInstitut\DataCache;

/**
 * Interface to a generic data cache
 * @package ThomasInstitut\DataCache
 */

interface DataCache
{

    /**
     * Gets the value associated with the given key.
     * If the key is not the cache, throws a KeyNotInCacheException
     *
     * @param string $key
     * @return string
     * @throws KeyNotInCacheException
     */
    public function get(string $key) : string;

    /**
     * Sets the value for the given key
     * @param string $key
     * @param string $value
     * @return mixed
     */
    public function set(string $key, string $value) : void;

    /**
     * Deletes the cache entry for the given key
     * If the key is not the cache, throws a KeyNotInCacheException
     * @param string $key
     * @throws KeyNotInCacheException
     */
    public function delete(string $key) : void;

}