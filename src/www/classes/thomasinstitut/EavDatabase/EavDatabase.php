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

/**
 * Interface EavDatabase
 * An Entity-Attribute-Value database with strings
 * @package EavDatabase
 */
interface EavDatabase
{
    /**
     * @param string $entityId
     * @param string $attribute
     * @return string
     * @throws EntityNotFoundException
     * @throws AttributeNotFoundException
     */
    public function get(string $entityId, string $attribute) : string;

    /**
     * Returns an associative array with all the attributes and values for the given entityId
     * The returned array MUST not be empty
     *
     * @param string $entityId
     * @return array
     * @throws EntityNotFoundException
     */
    public function getEntityData(string $entityId) : array;

    /**
     * Sets the value for the given attribute and entity.
     * MUST throw an InvalidArgumentException if either attribute or entity
     * are empty strings
     *
     * @param string $entityId
     * @param string $attribute
     * @param string $value
     * @return void
     * @throws InvalidArgumentException
     */
    public function set(string $entityId, string $attribute, string $value) : void;

    /**
     * Deletes the given attribute for the given entity Id
     * if the given attribute is the only attribute set for the given entityId
     * the entity MUST be deleted
     * @param string $entityId
     * @param string $attribute
     */
    public function delete(string $entityId, string $attribute) : void;

    /**
     * Deletes the given entity and all its attributes
     * @param string $entityId
     */
    public function deleteEntity(string $entityId): void;

}