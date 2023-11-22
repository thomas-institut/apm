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
    private array $theCache;

    public function __construct()
    {
        $this->theCache = [];
    }

    /**
     * @inheritDoc
     */
    public function get(string $key): string
    {
        $now = time();
        if ($this->isInCache($key)) {
            if ($this->theCache[$key]['expires'] !== -1 && $this->theCache[$key]['expires'] < $now) {
                // expired!
                $this->delete($key);
                throw new KeyNotInCacheException("Key '$key' not in cache");
            }
            return $this->theCache[$key]['value'];
        }
        throw new KeyNotInCacheException();
    }

    /**
     * @inheritDoc
     */
    public function set(string $key, string $value, int $ttl = 0): void
    {
        $expires = -1;
        if ($ttl > 0) {
            $expires = time() + $ttl;
        }
        $this->theCache[$key] = [ 'value' => $value, 'expires' => $expires];
    }

    /**
     * @inheritDoc
     */
    public function delete(string $key): void
    {
        if ($this->isInCache($key)) {
            unset($this->theCache[$key]);
        }
    }

    public function isInCache(string $key): bool
    {
        return isset($this->theCache[$key]);
    }

    public function clear(): void
    {
       $this->theCache = [];
    }

    public function clean(): void
    {
        $keysToDelete = [];
        $now = time();
        foreach (array_keys($this->theCache) as $key) {
            if ($this->theCache[$key]['expires'] < $now) {
                $keysToDelete[] = $key;
            }
        }
        foreach ($keysToDelete as $key) {
            $this->delete($key);
        }
    }

    public function getKeys() : array {
        return array_keys($this->theCache);
    }
}