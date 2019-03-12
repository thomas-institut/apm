<?php

/*
 * Copyright (C) 2016-19 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

namespace APM\Presets;

use DataTable\DataTable;

/**
 * An implementation of a PresetManager using a DataTable as
 * the underlying storage. 
 * 
 * The manager's dataTable must be configured with fields for
 *  - tool (string)
 *  - user Id (int
 *  - keyArray (JSON, i.e., string)
 *  - data  (JSON, i.e., string)
 * 
 * The dataTable may also contain fields for particular keys from
 * the keyArray that the manager will use to optimize queries into 
 * the DataTable. Otherwise, the manager will simply retrieve all rows
 * only possibly filtering by tool and user at the DataTable level, and then 
 * searching for matches using that array. A good choice of particular keys to
 * store in their own fields may greatly increase performance when the underlying
 * DataTable uses a SQL databaase.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class DataTablePresetManager extends PresetManager {
    
    /** @var  \DataTable\DataTable */
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
    }

     /**
     * Adds a preset to the system.
     * 
     * Returns false if there is a preset in the system
     * with the same tool, userid and title as the
     * givel $preset
     * 
     * @param \APM\Presets\Preset $preset
     * @return bool
     */
    public function addPreset(Preset $preset): bool {
        if ($this->correspondingPresetExists($preset)) {
            return false;
        }
        return $this->dataTable->createRow($this->createDataTableRowFromPreset($preset)) !== false;
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
        return $this->dataTable->deleteRow($id);
    }

    /**
     * Returns the Preset identified by $tool, $userId and $title or
     * false if there's no such preset in the system.
     * 
     * @param string $tool
     * @param int $userId
     * @param string $title
     * @return boolean
     */
    public function getPreset(string $tool, int $userId, string $title) {
        $row = $this->getPresetRow($tool, $userId, $title);
        if ($row === false) {
            return false;
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
        $rows = $this->dataTable->findRows([self::FIELD_TOOL => $tool]);
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
        $rows = $this->dataTable->findRows([self::FIELD_TOOL => $tool, self::FIELD_USERID => $userId]);
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
     * @param \APM\Presets\Preset $preset
     * @return array
     */
    protected function createDataTableRowFromPreset(Preset $preset) : array {
        // not storing expanded keys for now
        return [ 
            self::FIELD_TOOL => $preset->getTool(), 
            self::FIELD_USERID => $preset->getUserId(),
            self::FIELD_TITLE => $preset->getTitle(),
            self::FIELD_KEYARRAY => $this->encodeArrayToString($preset->getKeyArray()),
            self::FIELD_DATA => $this->encodeArrayToString($preset->getData())
            ];
    }
    
    /**
     * Creates a Preset object from a DataTable 
     * 
     * @param array $theRow
     * @return \APM\Presets\Preset
     */
    protected function createPresetFromDataTableRow(array $theRow) : Preset {
        return new Preset(
                $theRow[self::FIELD_TOOL], 
                $theRow[self::FIELD_USERID], 
                $theRow[self::FIELD_TITLE],
                $this->decodeStringToArray($theRow[self::FIELD_KEYARRAY]),
                $this->decodeStringToArray($theRow[self::FIELD_DATA])
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
     * @return type
     */
    protected function getPresetRow(string $tool, int $userId, string $title) {
        $rowToFind = [ 
            self::FIELD_TOOL => $tool, 
            self::FIELD_USERID => $userId,
            self::FIELD_TITLE => $title
        ];
        return $this->dataTable->findRow($rowToFind);
    }
   
    /**
     * Returns the row id for the preset identified by $tool, $userId and $title
     * or self::ROWID_NOTFOUND if such a preset does not exist
     * 
     * @param string $tool
     * @param int $userId
     * @param string $title
     * @return type
     */
    protected function getRowIdForPreset(string $tool, int $userId, string $title) {
        $row = $this->getPresetRow($tool, $userId, $title);
        if ($row === false) {
            return self::ROWID_NOTFOUND;
        }
        return $row['id'];
    }

}
