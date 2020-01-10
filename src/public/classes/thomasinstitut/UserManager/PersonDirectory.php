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

namespace ThomasInstitut\UserManager;


use Exception;
use InvalidArgumentException;
use RuntimeException;
use ThomasInstitut\DataValidator\dataValidator;
use ThomasInstitut\DataStore\DataStore;

/**
 * Class PersonDirectory
 *
 * A PersonDirectory is basically a storage for all sorts of information about a person: names, addresses,
 * user names, and so on.
 *
 * The information for a Person consists of a restricted set of named data fields, each of which must validate
 * against a user given validator. All data fields are optional. Restricted means that only properly registered
 * data fields are allowed to the stored in the directory.
 *
 *
 *
 * @package ThomasInstitut
 */
class PersonDirectory
{

    const ERROR_PERSON_ALREADY_EXISTS = 101;
    const ERROR_CANNOT_GENERATE_NEW_ID = 102;
    const ERROR_PERSON_DOES_NOT_EXIST = 103;
    const ERROR_DATA_FIELD_IS_INVALID = 104;
    const ERROR_FIELD_NOT_REGISTERED = 105;


    const MAX_ID_TRIES = 1000;
    const MIN_ID = 1;
    const MAX_ID = PHP_INT_MAX;
    /**
     * @var DataStore
     */
    private $dataStore;
    /**
     * @var string
     */
    private $keyPrefix;

    /**
     * @var array
     */
    private $validators;

    public function __construct(DataStore $dataStore, string $keyPrefix = 'PERSON:')
    {
        $this->dataStore = $dataStore;
        $this->keyPrefix = $keyPrefix;
        $this->validators = [];
    }

    public function registerDataField(string $dataField, dataValidator $validator) : void {
        $this->setValidator($dataField, $validator);
    }

    public function isDataFieldRegistered(string $dataField) : bool {
        return isset($this->validators[$dataField]);
    }

    private function setValidator($dataField, dataValidator $validator) : void {
        $this->validators[$dataField] = $validator;
    }

    private function getValidator($dataField) : dataValidator {
        return $this->validators[$dataField];
    }

    /**
     * @param int $desiredId
     * @return int
     * @throws Exception
     */
    public function addNewPerson(int $desiredId = 0) : int {
        if ($desiredId !== 0 && $this->personExists($desiredId)) {
            throw new InvalidArgumentException('Person already exists', self::ERROR_PERSON_ALREADY_EXISTS);
        }

        $personId = $desiredId !== 0 ? $desiredId : $this->generateNewPersonId();

        $this->dataStore->setValue($this->getDataStoreKeyForPersonId($personId), []);
        return $personId;
    }

    public function setPersonData(int $personId, array $personData) : void {
        foreach($personData as $fieldName => $dataField) {
            $this->setPersonDataField($personId, $fieldName, $dataField);
        }
    }

    public function setPersonDataField(int $personId, string $fieldName, $dataField) : void {
        if (!$this->isDataFieldRegistered($fieldName)){
            throw new InvalidArgumentException("Field '$fieldName' is not allowed", self::ERROR_FIELD_NOT_REGISTERED);
        }

         $validator = $this->getValidator($dataField);
         if (!$validator->isValid($dataField)) {
             throw new InvalidArgumentException(
                 "Data field '$fieldName' is invalid : (" . $validator->getErrorCode() . ") " .
                 $validator->getErrorMessage(),
                 self::ERROR_DATA_FIELD_IS_INVALID);
         }
        $this->setDataFieldInDataStore($personId, $fieldName, $dataField);
    }

    private function setDataFieldInDataStore(int $personId, string $fieldName, $dataField) : void {
        if (!$this->personExists($personId)) {
            throw new InvalidArgumentException("Person does not exist", self::ERROR_PERSON_DOES_NOT_EXIST);
        }

        $storeKey = $this->getDataStoreKeyForPersonId($personId);
        $currentData = $this->dataStore->getValue($storeKey);

        $currentData[$fieldName] = $dataField;

        $this->dataStore->setValue($storeKey, $currentData);
    }

    public function personExists(int $personId) : bool {
        if ($personId <= 0 ) {
            return false;
        }

        return $this->dataStore->keyExists($this->getDataStoreKeyForPersonId($personId));
    }

    /**
     * @return int
     * @throws Exception
     */
    protected  function generateNewPersonId() : int {

        $tries = 0;
        while ($tries < self::MAX_ID_TRIES ){
            $id = random_int(self::MIN_ID, self::MAX_ID);
            if (!$this->personExists($id)) {
                return $id;
            }
            $tries++;
        }
        throw new RuntimeException('Cannot generate new unique Id', self::ERROR_CANNOT_GENERATE_NEW_ID);
    }

    protected function getDataStoreKeyForPersonId(int $personId) {
        return $this->keyPrefix . $personId;
    }



}