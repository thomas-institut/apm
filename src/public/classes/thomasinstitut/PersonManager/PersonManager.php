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

namespace ThomasInstitut\PersonManager;

/**
 *
 * A person manager provides basic methods for managing generic person information.
 *
 * Given that APM and DARE hold various types of data associated with a person, there is
 * no method to delete a person from the system. Individual data, however, can be deleted
 *
 * @package ThomasInstitut\PersonManager
 */
abstract class PersonManager
{

    /**
     * Returns an array with the person's data fields requested in $requestedFields
     * if a requested field does not exist, the field is unset in the returned array.
     *
     * @param string $personId
     * @param array $requestedFields
     * @return array
     * @throws PersonDoesNotExist
     */
    abstract public function getPersonData(string $personId, array $requestedFields = []): array;

    /**
     * Sets several person data fields at the same time
     * The given $data array must be an associative array with string keys
     * and string values:
     *  $data = [ 'field1' => 'value1', .... ]
     *
     * @param string $personId
     * @param array $data
     * @return void
     * @throws PersonDoesNotExist
     */
    public function setPersonData(string $personId, array $data) : void {
        foreach ($data as $field => $value) {
            $this->setPersonDataField($personId, $field, $value);
        }
    }

    /**
     * Sets one person data field
     * @param string $personId
     * @param string $dataField
     * @param string $value
     * @return void
     * @throws PersonDoesNotExist
     */
    abstract public function setPersonDataField(string $personId, string $dataField, string $value) : void;


    /**
     * Deletes a person data field
     * It does not report whether the person or data field existed before the operation.
     * @param string $personId
     * @param string $dataField
     */
    abstract public function deletePersonDataField(string $personId, string $dataField) : void;

    /**
     * Creates a new person in the database. Returns the new person's personId
     * @return string
     */
    abstract public function createNewPerson() : string;

}