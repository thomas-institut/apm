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

namespace ThomasInstitut\DataStore;

/**
 * Interface iDataStore
 *
 * A dataStore allows for the storage and retrieval of generic values.
 *
 * A value can be of any of the JSON data types:
 *
 *   number :  no distinction between float and integer
 *   string
 *   boolean:  true or false
 *   object: an unordered collection of key-value pairs, where keys are unique strings within the object
 *           Note: an object is basically a PHP associative array.
 *   array: an ordered list of zero or more values, each of which may be of any type
 *   null:  empty value
 *
 * Values in the DataStore are identified by a unique string Id, called a key.
 * A DataStore can be thought of as a JSON object.
 *
 * @package ThomasInstitut
 */
interface DataStore
{

    /**
     * Returns the data item with the given $id or null if not found
     * Use dataItemExists to check whether the data item actually exists
     *
     * @param string $key
     * @return mixed
     */
    public function getValue(string $key);


    /**
     * Returns a value as a Json string
     *
     * @param string $key
     * @return string
     */
    public function getJson(string $key) : string;

    /**
     * @param string $key
     * @return bool
     */
    public function keyExists(string $key): bool;


    /**
     * Sets the value of the data item with the given Id.
     * Overwrites the current existing value, or creates the value if
     * it doesn't exist.
     *
     * @param string $key
     * @param $value
     * @return void
     */
    public function setValue(string $key, $value) : void;


    /**
     * Sets a value from a Json string
     *
     * @param string $key
     * @param string $json
     */
    public function setJson(string $key, string $json) : void;

    /**
     * Adds a value if it does not exist.
     *
     * Returns true if the value was added.
     *
     * @param string $key
     * @param $value
     * @return bool
     */
    public function addValue(string $key, $value) : bool;


    /**
     * Adds a value from a Json string
     *
     * @param string $key
     * @param string $json
     * @return bool
     */
    public function addJson(string $key, string $json): bool;

    /**
     * Deletes a value
     *
     * @param string $key
     * @return mixed
     */
    public function deleteValue(string $key);

}