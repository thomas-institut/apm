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

/**
 * Interface GenericDataStore
 *
 * A GenericDataStore allows storage and retrieval of generic properties for objects identified by
 * a unique integer id.
 *
 * Different kinds of information, properties, for an object are identified by unique strings which could be anything.
 * In practice property names may be something meaningful, like 'fullName' or 'emailAddress'
 *
 * A property can have 0 or more values. Each value is itself an associate array of string values.
 * The data store provides methods to set and add property values
 *
 * Properties are stored and retrieved as arrays (normal or associative) of string values.
 *
 * It is up to the application to decide on the meaning, format and validity of the values stored, and
 * whether the order of those values is relevant or not.
 *
 * New objects can be added, but they cannot be deleted. This ensures that object ids are not reused.
 *
 * @package ThomasInstitut
 */
interface iDataStore
{
    const ERROR_OBJECT_NOT_FOUND = 100;

    /**
     * If the given propertyName does not exist, returns an empty array.
     * Errors are reported with exceptions
     *
     * @param int $objectId
     * @param string $propertyName
     * @return array
     */
    public function getProperty(int $objectId, string $propertyName) : array;



    /**
     * Set a property for a given object.
     *
     * If the property does not exist, it is initialized with the given value.
     * If the property exists, its values are overwritten.
     *
     * @param int $objectId
     * @param string $propertyName
     * @param array $propertyValues
     */
    public function setProperty(int $objectId, string $propertyName, array $propertyValues) : void;


    public function addPropertyValue(int $objectId, string $propertyName, array $propertyValue) : void;

    /**
     * Returns all the info for the given object as an associative array :
     *  [ 'property1' => [ value1, value2, ...] , 'property2' => [...] ,  .... ]
     *
     * @param int $objectId
     * @return array
     */
    public function getAllProperties(int $objectId) : array;


    /**
     * Adds a new object
     *
     * If the given $personId is -1, a new unique Id will be generated. If not, the given
     * Id will be used. If that Id already exists an InvalidArgumentException will be
     * thrown.
     *
     * Returns the id of the newly added object.
     *
     * @param int $objectId
     * @return int
     */
    public function addNewObject(int $objectId = -1) : int;

}