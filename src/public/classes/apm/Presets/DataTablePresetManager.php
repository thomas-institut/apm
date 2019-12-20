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

namespace APM\Presets;

use APM\System\iSqlQueryCounterTrackerAware;
use APM\System\SimpleSqlQueryCounterTrackerAware;
use APM\System\SqlQueryCounterTracker;
use DataTable\DataTable;
use DataTable\MySqlDataTable;
use Exception;
use InvalidArgumentException;

/**
 * An implementation of a PresetManager using a DataTable as the underlying storage.
 * 
 * The manager's dataTable must be configured with fields for
 *  - tool (string)
 *  - user Id (int
 *  - keyArray (JSON, i.e., string)
 *  - data  (JSON, i.e., string)
 * 
 * The dataTable may also contain fields for particular keys from the keyArray that the manager will use to optimize
 * queries into the DataTable. Otherwise, the manager will simply retrieve all rows only possibly filtering by tool
 * and user at the DataTable level, and then searching for matches using that array. A good choice of particular keys
 * to store in their own fields may greatly increase performance when the underlying  DataTable uses a SQL database.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class DataTablePresetManager extends PresetManager implements iSqlQueryCounterTrackerAware {

    use SimpleSqlQueryCounterTrackerAware;

    /** @var  DataTable */
    private $dataTable;
    
    /** @var array */
    private $expandedKeys;
    
    const FIELD_USERID = 'user_id';
    const FIELD_TOOL = 'tool';
    const FIELD_TITLE = 'title';
    const FIELD_KEYARRAY = 'key_array';
    const FIELD_DATA = 'data';
    
    const ROWID_NOTFOUND = -1;
    
    /**
     * Creates a new DataTablePresetManager with the given DataTable and
     * an optional list of expanded Keys.
     * 
     * Expanded keys are components of a Preset's keyArray that are
     * stored in their own field in the DataTable rows. The $expandedKeys
     * array must provide an association of keys from keyArray to
     * field names in the DataTable:
     *   $expandedKeys = [ 'key1' => 'dataTableFieldName1', 'key2 => 'fieldName2, ... ] 
     * 
     * 
     * @param DataTable $dt
     * @param array $expandedKeys
     */
    public function __construct(DataTable $dt, array $expandedKeys = []) {
        $this->dataTable = $dt;
        $this->expandedKeys  = $expandedKeys;
        $this->initSqlQueryCounterTracker();
    }

     /**
     * Adds a preset to the system.
     * 
     * Returns false if there is a preset in the system
     * with the same tool, user id and title as the
     * given $preset
     * 
     * @param Preset $preset
     * @return bool
     */
    public function addPreset(Preset $preset): bool {
        if ($this->correspondingPresetExists($preset)) {
            return false;
        }
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::CREATE_COUNTER);
        $this->dataTable->createRow($this->createDataTableRowFromPreset($preset));
        return true;
    }

    /**
     * Erases the preset identified by $tool, $userId and $title
     * 
     * Returns true if the preset was successfully erased from the 
     * system or if it did not exist in the first place.
     * 
     * @param string $tool
     * @param int $userId
     * @param string $title
     * @return bool
     */
    public function erasePreset(string $tool, int $userId, string $title): bool {
        $id = $this->getRowIdForPreset($tool, $userId, $title);
        if ($id === self::ROWID_NOTFOUND) {
            return true;
        }
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::DELETE_COUNTER);
        return $this->dataTable->deleteRow($id)===1;
    }

    /**
     * Returns the Preset identified by $tool, $userId and $title
     * Throws an exception is the preset is not found
     *
     * @param string $tool
     * @param int $userId
     * @param string $title
     * @return Preset
     * @throws InvalidArgumentException
     */
    public function getPreset(string $tool, int $userId, string $title) : Preset {
        $row = $this->getPresetRow($tool, $userId, $title);
        if ($row === []) {
            throw $this->newPresetNotFoundException();
        }
        return $this->createPresetFromDataTableRow($row);
    }

     /**
     * Returns an array containing all the Preset objects in the system
     * that match the given $tool and $keysToMatch
     * 
     * @param string $tool
     * @param array $keysToMatch
     * @return array
     */
    public function getPresetsByToolAndKeys(string $tool, array $keysToMatch): array {
        $matchedPresets = [];
        $rowToFind = [self::FIELD_TOOL => $tool];
        foreach($keysToMatch as $key => $value) {
            if (isset($this->expandedKeys[$key])) {
                $rowToFind[$this->expandedKeys[$key]] = $value;
            }
        }
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
        $rows = $this->dataTable->findRows($rowToFind);
        foreach($rows as $theRow) {
            if ($this->match($this->decodeStringToArray($theRow[self::FIELD_KEYARRAY]), $keysToMatch)) {
                $matchedPresets[] = $this->createPresetFromDataTableRow($theRow);
            }
        }
        return $matchedPresets;
    }

    /**
     * Returns an array containing all the Preset objects in the system
     * that match the given $tool, $userId and $keysToMatch
     * 
     * @param string $tool
     * @param int $userId
     * @param array $keysToMatch
     * @return array
     */
    public function getPresetsByToolUserIdAndKeys(string $tool, int $userId, array $keysToMatch): array {
        $matchedPresets = [];
        $rowToFind = [self::FIELD_TOOL => $tool, self::FIELD_USERID => $userId];
        foreach($keysToMatch as $key => $value) {
            if (isset($this->expandedKeys[$key])) {
                $rowToFind[$this->expandedKeys[$key]] = $value;
            }
        }
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
        $rows = $this->dataTable->findRows($rowToFind);
        foreach($rows as $theRow) {
            if ($this->match($this->decodeStringToArray($theRow[self::FIELD_KEYARRAY]), $keysToMatch)) {
                $matchedPresets[] = $this->createPresetFromDataTableRow($theRow);
            }
        }
        return $matchedPresets;
    }

    /**
     * Returns true if the preset identified by $too, $userId and $title
     * exists in the system
     * 
     * @param string $tool
     * @param int $userId
     * @param string $title
     * @return bool
     */
    public function presetExists(string $tool, int $userId, string $title): bool {
        return $this->getRowIdForPreset($tool, $userId, $title) !== self::ROWID_NOTFOUND;
    }
    
    public function getPresetById(int $id) : Preset {
        try {
            $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
            $row = $this->dataTable->getRow($id);
        } catch (InvalidArgumentException $e) {
            if ($e->getCode() === DataTable::ERROR_ROW_DOES_NOT_EXIST) {
                throw $this->newPresetNotFoundException();
            }
            throw $e; // @codeCoverageIgnore
        }
        return $this->createPresetFromDataTableRow($row);
    }
    
    public function updatePresetById(int $id, Preset $updatedPreset) {
        if (!$this->presetExistsById($id)) {
            return false;
        }
        $currentPreset = $this->getPresetById($id);

        $updatedRow = $this->createDataTableRowFromPreset($updatedPreset);
        $updatedRow['id'] = $currentPreset->getId();
        try {
            $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::UPDATE_COUNTER);
            $this->dataTable->updateRow($updatedRow);
        } catch (Exception $e) { // @codeCoverageIgnore
            return false; // @codeCoverageIgnore
        }
        return true;
    }
    
    public function erasePresetById(int $id) : bool {
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::DELETE_COUNTER);
        $this->dataTable->deleteRow($id);
        return true;
    }
    
    
    /**
     * PROTECTED METHODS
     */
    
    
    /**
     * Encodes an array into a string
     * 
     * @param array $theArray
     * @return string
     */
    protected function encodeArrayToString(array $theArray) : string {
        return json_encode($theArray);
    }
    
    /**
     * Decodes a string into an array 
     * 
     * @param string $theString
     * @return array
     */
    protected function decodeStringToArray(string $theString) : array {
        return json_decode($theString, true);
    }
    
    /**
     * Returns an associative array that can be used to store a Preset
     * as a row in a DataTable
     * 
     * @param Preset $preset
     * @return array
     */
    protected function createDataTableRowFromPreset(Preset $preset) : array {
        // In this implemenation the preset's key array is stored full in
        // the self::FIELD_KEYARRAY field, and then, copies of the expanded
        // keys are stored in the own fields. 
        $keyArray = $preset->getKeyArray();
        $theRow = [ 
            self::FIELD_TOOL => $preset->getTool(), 
            self::FIELD_USERID => $preset->getUserId(),
            self::FIELD_TITLE => $preset->getTitle(),
            self::FIELD_KEYARRAY => $this->encodeArrayToString($keyArray),
            self::FIELD_DATA => $this->encodeArrayToString($preset->getData())
            ];
        
        foreach($this->expandedKeys as $key => $fieldName) {
            $theRow[$fieldName] = isset($keyArray[$key]) ? $keyArray[$key] : '';
        }
        return $theRow;
    }
    
    /**
     * Creates a Preset object from a DataTable row
     * 
     * @param array $theRow
     * @return Preset
     */
    protected function createPresetFromDataTableRow(array $theRow) : Preset {
        // There's no need to deal with expanded keys since all key information
        // is stored in the self::FIELD_KEYARRAY field
        return new Preset(
                $theRow[self::FIELD_TOOL], 
                $theRow[self::FIELD_USERID], 
                $theRow[self::FIELD_TITLE],
                $this->decodeStringToArray($theRow[self::FIELD_KEYARRAY]),
                $this->decodeStringToArray($theRow[self::FIELD_DATA]), 
                $theRow['id']
            );
    }
    
    /**
     * Returns that row that contains the preset identified by 
     * $tool, $userId and $title, or false if such preset does not
     * exist 
     * 
     * @param string $tool
     * @param int $userId
     * @param string $title
     * @return array
     */
    protected function getPresetRow(string $tool, int $userId, string $title) : array {
        $rowToFind = [ 
            self::FIELD_TOOL => $tool, 
            self::FIELD_USERID => $userId,
            self::FIELD_TITLE => $title
        ];
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
        $rows = $this->dataTable->findRows($rowToFind, 1);
        if (count($rows) < 1) {
            return [];
        }
        return $rows[0];
    }
   
    /**
     * Returns the row id for the preset identified by $tool, $userId and $title
     * or self::ROWID_NOTFOUND if such a preset does not exist
     * 
     * @param string $tool
     * @param int $userId
     * @param string $title
     * @return int
     */
    protected function getRowIdForPreset(string $tool, int $userId, string $title) : int {
        $row = $this->getPresetRow($tool, $userId, $title);
        if ($row === []) {
            return self::ROWID_NOTFOUND;
        }
        return $row['id'];
    }

    public function presetExistsById(int $id): bool
    {
        return $this->dataTable->rowExists($id);
    }
}
