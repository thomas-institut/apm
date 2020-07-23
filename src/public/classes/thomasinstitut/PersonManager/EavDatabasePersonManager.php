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

use ThomasInstitut\EavDatabase\EavDatabase;
use ThomasInstitut\EavDatabase\EavDatabaseException;
use ThomasInstitut\EavDatabase\EntityNotFoundException;


class EavDatabasePersonManager extends PersonManager
{
    const PERSON_ID_FIELD = 'PersonId';
    const DEFAULT_MANAGER_ID = 'PM';
    const METADATA_ENTITY_ID = 'meta';
    const PERSON_ID_PREFIX = 'P';

    /* Meta data attributes */
    const ATTR_CURRENT_MAX_ID = 'MaxId';

    /**
     * @var EavDatabase
     */
    private $database;
    /**
     * @var string
     */
    private $managerId;

    /**
     * EavDatabasePersonManager constructor.
     * Constructs a PersonManager using the given EavDatabase as storage
     * If a managerId string is given, it will be used to prefix all
     * entities created by the PersonManager. This allows the EavDatabase to be
     * used for other purposes
     * @param EavDatabase $database
     * @param string $managerId
     */
    public function __construct(EavDatabase $database, string $managerId = '')
    {
        $this->database = $database;
        $this->managerId = self::DEFAULT_MANAGER_ID;
        if ($managerId !== '') {
            $this->managerId = $managerId;
        }
    }

    private function getEntityId(string $personId) : string {
        return $this->managerId . '_' . $personId;
    }

    public function getPersonData(string $personId, array $requestedFields = []): array
    {
        try {
            $personDataInDatabase = $this->database->getEntityData($this->getEntityId($personId));
        } catch (EntityNotFoundException $e) {
            throw new PersonDoesNotExist("Person '$personId' does not exist");
        }

        unset($personDataInDatabase[self::PERSON_ID_FIELD]);

        if ($requestedFields === []) {
            return $personDataInDatabase;
        }

        $personData = [];
        foreach($requestedFields as $field) {
            if (isset($personDataInDatabase[$field])) {
                $personData[$field] = $personDataInDatabase[$field];
            }
        }
        return $personData;
    }

    /**
     * @param string $personId
     * @param string $dataField
     * @param string $value
     * @throws InvalidArgumentException
     */
    public function setPersonDataField(string $personId, string $dataField, string $value): void
    {
        if ($dataField === self::PERSON_ID_FIELD) {
            throw new InvalidArgumentException("Invalid data field '$dataField'");
        }

        try {
            $this->database->set($this->getEntityId($personId), $dataField, $value);
        } catch (\ThomasInstitut\EavDatabase\InvalidArgumentException $e) {
            throw new InvalidArgumentException($e->getMessage());
        }
    }

    /**
     * @param string $personId
     * @param string $dataField
     * @throws InvalidArgumentException
     */
    public function deletePersonDataField(string $personId, string $dataField): void
    {
        if ($dataField === self::PERSON_ID_FIELD) {
            throw new InvalidArgumentException("Invalid data field '$dataField'");
        }

        $this->database->delete($this->getEntityId($personId), $dataField);
    }

    /**
     * @return string
     * @throws CorruptedDatabase
     */
    public function createNewPerson(): string
    {
        $maxId = $this->getCurrentMaxId();
        $personId = $this->getPersonIdFromInt($maxId+1);

        try {
            $this->database->set($personId, self::PERSON_ID_FIELD, $personId);
        } catch (\ThomasInstitut\EavDatabase\InvalidArgumentException $e) {
            // this would only happen with a corrupted database
            throw new CorruptedDatabase("EavDatabase returned an invalid arg exception creating new person. Message: " . $e->getMessage());
        }
        $this->setCurrentMaxId($maxId+1);
        return $personId;
    }

    private function getCurrentMaxId() : int {
        try {
            $id = $this->database->get($this->getEntityId(self::METADATA_ENTITY_ID), self::ATTR_CURRENT_MAX_ID);
        } catch (EavDatabaseException $e) {
            $id = '0';
        }
        return intval($id);
    }

    private function setCurrentMaxId(int $maxId) {
        $this->database->set($this->getEntityId(self::METADATA_ENTITY_ID), self::ATTR_CURRENT_MAX_ID, (string) $maxId);
    }

    private function getPersonIdFromInt(int $id) : string {
        return sprintf("%s%05d", self::PERSON_ID_PREFIX , $id);
    }
}