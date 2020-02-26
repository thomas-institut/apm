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


class InMemoryDataCache implements DataCache
{

    /**
     * @var array
     */
    private $theCache;

    public function __construct()
    {
        $this->theCache = [];
    }

    /**
     * @inheritDoc
     */
    public function get(string $key): string
    {
        if (isset($this->theCache[$key])) {
            return $this->theCache[$key];
        }
        throw new KeyNotInCacheException();
    }

    /**
     * @inheritDoc
     */
    public function set(string $key, string $value): void
    {
        $this->theCache[$key] = $value;
    }

    /**
     * @inheritDoc
     */
    public function delete(string $key): void
    {
        if (isset($this->theCache[$key])) {
            unset($this->theCache[$key]);
            return;
        }
        throw new KeyNotInCacheException();
    }
}