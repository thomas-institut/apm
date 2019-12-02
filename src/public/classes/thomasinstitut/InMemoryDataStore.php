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

namespace ThomasInstitut;


use InvalidArgumentException;

/**
 * Class InMemoryDataStore
 * A DataStore implemented with PHP arrays
 *
 * @package ThomasInstitut
 */
class InMemoryDataStore implements iDataStore
{

    /**
     * @var array
     */
    private $data;


    public function __construct()
    {
        $this->data = [];
    }

    /**
     * @inheritDoc
     */
    public function getProperty(int $objectId, string $propertyName): array
    {
        if (!isset($this->data[$objectId])) {
            throw new InvalidArgumentException('Object not found', iDataStore::ERROR_OBJECT_NOT_FOUND);
        }

        if (!isset($this->data[$objectId][$propertyName])) {
            return [];
        }

        return $this->data[$objectId][$propertyName];

    }

    /**
     * @inheritDoc
     */
    public function setProperty(int $objectId, string $propertyName, array $propertyValues): void
    {
        if (!isset($this->data[$objectId])) {
            throw new InvalidArgumentException('Object not found', iDataStore::ERROR_OBJECT_NOT_FOUND);
        }

        // get the values indexed numerically
        $realPropertyValues = array_values($propertyValues);

        $this->data[$objectId][$propertyName] = $realPropertyValues;
    }

    /**
     * @inheritDoc
     */
    public function getAllProperties(int $objectId): array
    {
        if (!isset($this->data[$objectId])) {
            throw new InvalidArgumentException('Object not found', iDataStore::ERROR_OBJECT_NOT_FOUND);
        }
        return $this->data[$objectId];
    }

    /**
     * @inheritDoc
     */
    public function addNewObject(int $objectId = -1): int
    {
        $this->data[] = [];
        return count($this->data) - 1;
    }

    public function addPropertyValue(int $objectId, string $propertyName, array $propertyValue): void
    {
        if (!isset($this->data[$objectId])) {
            throw new InvalidArgumentException('Object not found', iDataStore::ERROR_OBJECT_NOT_FOUND);
        }

        if (!isset($this->data[$objectId][$propertyName])) {
            $this->data[$objectId][$propertyName] = [];
        }

        $this->data[$objectId][$propertyName][] = $propertyValue;
    }
}