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

namespace ThomasInstitut\EavDatabase;


class InMemoryEavDatabase implements EavDatabase
{

    /**
     * @var array
     */
    private $data;

    public function __construct()
    {
        $this->data = [];
    }

    public function get(string $entityId, string $attribute): string
    {
        if (!isset($this->data[$entityId])) {
            throw new EntityNotFoundException("Entity '$entityId' not found");
        }

        if (!isset($this->data[$entityId][$attribute])) {
            throw new AttributeNotFoundException( "Attribute '$attribute' not found for entity '$entityId'");
        }

        return $this->data[$entityId][$attribute];

    }

    public function getEntityData(string $entityId): array
    {
        if (!isset($this->data[$entityId])) {
            throw new EntityNotFoundException("Entity '$entityId' not found");
        }
        return $this->data[$entityId];
    }

    public function set(string $entityId, string $attribute, string $value) : void
    {
        if ($entityId === '') {
            throw new InvalidArgumentException('Entity Id must not be an empty string');
        }
        if ($attribute === '') {
            throw new InvalidArgumentException('Attribute must not be an empty string');
        }
        if (!isset($this->data[$entityId])) {
            $this->data[$entityId] = [];
        }
        $this->data[$entityId][$attribute] = $value;
    }

    public function delete(string $entityId, string $attribute): void
    {
        if (isset($this->data[$entityId])) {
            if (isset($this->data[$entityId][$attribute])) {
                unset($this->data[$entityId][$attribute]);
            }
            if ($this->data[$entityId] === []) {
                unset($this->data[$entityId]);
            }
        }
    }

    public function deleteEntity(string $entityId): void
    {
        if (isset($this->data[$entityId])) {
            unset($this->data[$entityId]);
        }
    }
}