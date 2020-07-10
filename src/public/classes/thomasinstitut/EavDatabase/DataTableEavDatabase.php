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


use ThomasInstitut\DataCache\CacheAware;
use ThomasInstitut\DataCache\InMemoryDataCache;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\DataCache\SimpleCacheAware;
use ThomasInstitut\DataTable\DataTable;

class DataTableEavDatabase implements EavDatabase, CacheAware
{

    use SimpleCacheAware;
    const FIELD_ENTITY = 'entity';
    const FIELD_ATTRIBUTE = 'attribute';
    const FIELD_VALUE = 'value';
    /**
     * @var array
     */
    private $fieldMap;

    /**
     * @var DataTable
     */
    private $dataTable;


    /**
     * DataTableEavDatabase constructor.
     * $fieldArray, if given, is a array with 3 elements containing the names
     * of the Datatable fields that correspond to entity, attribute and value
     * @param DataTable $dt
     * @param array $fieldArray
     * @throws InvalidArgumentException
     */
    public function __construct(DataTable $dt, array $fieldArray = [])
    {
        $this->fieldMap = [
            self::FIELD_ENTITY => self::FIELD_ENTITY,
            self::FIELD_ATTRIBUTE => self::FIELD_ATTRIBUTE,
            self::FIELD_VALUE => self::FIELD_VALUE
        ];
        if ($fieldArray !== []) {
            if (count($fieldArray) !== 3) {
                throw new InvalidArgumentException("Field array must have exactly 3 elements");
            }
            foreach ($fieldArray as $key => $fieldName) {
                if (!is_string($fieldName) || $fieldName === '') {
                    throw new InvalidArgumentException("Field array must have non-empty string values, found wrong value in key $key");
                }
            }
            $this->fieldMap = [
                self::FIELD_ENTITY => $fieldArray[0],
                self::FIELD_ATTRIBUTE => $fieldArray[1],
                self::FIELD_VALUE => $fieldArray[2]
            ];
        }

        $this->dataTable = $dt;

        $this->setCache(new InMemoryDataCache());
        $this->useCache();
    }

    /**
     * @inheritDoc
     */
    public function get(string $entityId, string $attribute): string
    {
        // by getting all entity data we can detect whether the entity actually exists
        // also, if there's an SQL engine behind the datatable, this actual query
        // will be cached, so it seems better to cache queries that provide more results
        $entityData = $this->getEntityData($entityId);

        if (!isset($entityData[$attribute])) {
            throw new AttributeNotFoundException("Attribute '$attribute' not found in entity '$entityId'");
        }
        return $entityData[$attribute];
    }

    /**
     * @inheritDoc
     */
    public function getEntityData(string $entityId): array
    {
        // find in cache
        try {
            $rows = $this->getEntityRowsFromCache($entityId);
        } catch (KeyNotInCacheException $e) {
            $rows = $this->dataTable->findRows([
                $this->fieldMap[self::FIELD_ENTITY] => $entityId
            ]);
            $this->saveEntityRowsToCache($entityId, $rows);
        }
        if (count($rows) === 0) {
            throw new EntityNotFoundException("Entity '$entityId' not found");
        }
        return $this->dtRowsToArray($rows)[$entityId];
    }

    /**
     * @inheritDoc
     * @throws KeyNotInCacheException
     */
    public function set(string $entityId, string $attribute, string $value): void
    {
        if ($entityId === '') {
            throw new InvalidArgumentException('Entity Id must not be an empty string');
        }
        if ($attribute === '') {
            throw new InvalidArgumentException('Attribute must not be an empty string');
        }


        if (!$this->isCacheInUse()) {
            // no cache, use brute force
            $rows = $this->dataTable->findRows([
                $this->fieldMap[self::FIELD_ENTITY] => $entityId,
                $this->fieldMap[self::FIELD_ATTRIBUTE] => $attribute,
            ]);
            if (count($rows) === 0) {
                // not in database, create
                $this->dataTable->createRow([
                    $this->fieldMap[self::FIELD_ENTITY] => $entityId,
                    $this->fieldMap[self::FIELD_ATTRIBUTE] => $attribute,
                    $this->fieldMap[self::FIELD_VALUE] => $value,
                ]);
            } else {
                // update
                $rows[0][$this->fieldMap[self::FIELD_VALUE]] = $value;
                $this->dataTable->updateRow($rows[0]);
            }
            return;
        }

        // get entity data (to refresh cache)
        try {
            $this->getEntityData($entityId);
        } catch (EntityNotFoundException $e) {
            // no entity, just create the new row
            $rowToCreate = [
                $this->fieldMap[self::FIELD_ENTITY] => $entityId,
                $this->fieldMap[self::FIELD_ATTRIBUTE] => $attribute,
                $this->fieldMap[self::FIELD_VALUE] => $value,
            ];
            $id = $this->dataTable->createRow($rowToCreate);
            // cache this
            $rowToCreate['id'] = $id;
            $this->saveEntityRowsToCache($entityId, [$rowToCreate]);
            return;
        }
        // there's an entity, let's get the row information from the cache
        $rows = $this->getEntityRowsFromCache($entityId);
        // find attribute in rows
        $rowNumber = $this->findAttributeInCacheRows($rows, $attribute);

        if ($rowNumber === -1) {
            // no attribute, just create a new row
            $rowToCreate = [
                $this->fieldMap[self::FIELD_ENTITY] => $entityId,
                $this->fieldMap[self::FIELD_ATTRIBUTE] => $attribute,
                $this->fieldMap[self::FIELD_VALUE] => $value,
            ];
            $id = $this->dataTable->createRow($rowToCreate);
            // cache the new information
            $rowToCreate['id'] = $id;
            $rows[] = $rowToCreate;
            $this->saveEntityRowsToCache($entityId, $rows);
            return;
        }
        // update the row
        $rowToUpdate = [
            'id' => $rows[$rowNumber]['id'],
            $this->fieldMap[self::FIELD_ENTITY] => $entityId,
            $this->fieldMap[self::FIELD_ATTRIBUTE] => $attribute,
            $this->fieldMap[self::FIELD_VALUE] => $value,
        ];
        $this->dataTable->updateRow($rowToUpdate);
        // update the cache
        $rows[$rowNumber] = $rowToUpdate;
        $this->saveEntityRowsToCache($entityId, $rows);
    }

    /**
     * @inheritDoc
     * @throws KeyNotInCacheException
     */
    public function delete(string $entityId, string $attribute): void
    {

        if (!$this->isCacheInUse()) {
            // no cache, use brute force
            $rows = $this->dataTable->findRows([
                $this->fieldMap[self::FIELD_ENTITY] => $entityId,
                $this->fieldMap[self::FIELD_ATTRIBUTE] => $attribute,
            ]);
            if (count($rows) !== 0) {
               $this->dataTable->deleteRow($rows[0]['id']);
            }
            return;
        }
        // with cache
        // get entity data (to refresh cache)
        try {
            $this->getEntityData($entityId);
        } catch (EntityNotFoundException $e) {
            // no entity, do nothing
            return;
        }

        // there's an entity, let's get the row information from the cache
        $rows = $this->getEntityRowsFromCache($entityId);
        $rowNumber = $this->findAttributeInCacheRows($rows, $attribute);
        if ($rowNumber === -1) {
            // no attribute, do nothing
            return;
        }
        $id = $rows[$rowNumber]['id'];
        $this->dataTable->deleteRow($id);
        // update cache
        unset($rows[$rowNumber]);
        $this->saveEntityRowsToCache($entityId, $rows);
    }

    private function findAttributeInCacheRows($rows, $attribute) : int {
        foreach($rows as $i => $row) {
            if ($row[$this->fieldMap[self::FIELD_ATTRIBUTE]] === $attribute) {
                return $i;
            }
        }
        return -1;
    }

    /**
     * @inheritDoc
     * @throws KeyNotInCacheException
     */
    public function deleteEntity(string $entityId): void
    {

        if (!$this->isCacheInUse()) {
            $rows = $this->dataTable->findRows([
                $this->fieldMap[self::FIELD_ENTITY] => $entityId
            ]);
        } else {
            // get entity data (to refresh cache)
            try {
                $this->getEntityData($entityId);
            } catch (EntityNotFoundException $e) {
                // no entity, do nothing
                return;
            }
            $rows = $this->getEntityRowsFromCache($entityId);
        }

        // this is not very efficient if the DataTable has an SQL database underneath
        foreach($rows as $row) {
            $this->dataTable->deleteRow($row['id']);
        }
        $this->deleteEntityRowsInCache($entityId);

    }

    private function dtRowsToArray($rows) {
        $theArray = [];
        foreach($rows as $row) {
            $entity = $row[$this->fieldMap[self::FIELD_ENTITY]];
            $attribute = $row[$this->fieldMap[self::FIELD_ATTRIBUTE]];
            $value = $row[$this->fieldMap[self::FIELD_VALUE]];
            if (!isset($theArray[$entity])) {
                $theArray[$entity] = [];
            }
            $theArray[$entity][$attribute] = $value;
        }
        return $theArray;
    }

    /**
     * Return true if the entity was in the cache
     * @param string $entityId
     * @return bool
     */
    private function deleteEntityRowsInCache(string $entityId) : bool {
        if (!$this->isCacheInUse()) {
            return false;
        }
        try {
            $this->dataCache->delete($entityId);
        } catch (KeyNotInCacheException $e) { // @codeCoverageIgnore
            return false; // @codeCoverageIgnore
        }
        return true;
    }

    /**
     * @param string $entityId
     * @param array $rows
     */
    private function saveEntityRowsToCache(string $entityId, array $rows) {
        if ($this->isCacheInUse()) {
            $this->dataCache->set($entityId, serialize($rows));
        }

    }

    /**
     * @param string $entityId
     * @return array
     * @throws KeyNotInCacheException
     */
    private function getEntityRowsFromCache(string $entityId) : array {
        if ($this->isCacheInUse()) {
            return unserialize($this->dataCache->get($entityId));
        }
        throw new KeyNotInCacheException();
    }
}