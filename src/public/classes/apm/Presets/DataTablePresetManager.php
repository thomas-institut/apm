<?php

/*
 * Copyright (C) 2016-18 Universität zu Köln
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
    
    /**
     *
     * @var  \DataTable\DataTable 
     */
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
     * stored in their field in the DataTable rows. The $expandedKeys
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
    
    protected function createPresetFromDataTableRow(array $theRow) {
        return new Preset(
                $theRow[self::FIELD_TOOL], 
                $theRow[self::FIELD_USERID], 
                $theRow[self::FIELD_TITLE],
                $this->decodeStringToArray($theRow[self::FIELD_KEYARRAY]),
                $this->decodeStringToArray($theRow[self::FIELD_DATA])
            );
    }
    
    protected function getPresetRow(string $tool, int $userId, string $title) {
        $rowToFind = [ 
            self::FIELD_TOOL => $tool, 
            self::FIELD_USERID => $userId,
            self::FIELD_TITLE => $title
        ];
        return $this->dataTable->findRow($rowToFind);
    }
   
    protected function getRowIdForPreset(string $tool, int $userId, string $title) {
        $row = $this->getPresetRow($tool, $userId, $title);
        if ($row === false) {
            return self::ROWID_NOTFOUND;
        }
        return $row['id'];
    }

    public function addPreset(Preset $preset): bool {
        if ($this->correspondingPresetExists($preset)) {
            return false;
        }
        return $this->dataTable->createRow($this->createDataTableRowFromPreset($preset)) !== false;
    }

    public function erasePreset(string $tool, int $userId, string $title): bool {
        $id = $this->getRowIdForPreset($tool, $userId, $title);
        if ($id === self::ROWID_NOTFOUND) {
            return true;
        }
        return $this->dataTable->deleteRow($id);
    }

    public function getPreset(string $tool, int $userId, string $title) {
        $row = $this->getPresetRow($tool, $userId, $title);
        if ($row === false) {
            return false;
        }
        return $this->createPresetFromDataTableRow($row);
    }

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

    public function presetExists(string $tool, int $userId, string $title): bool {
        return $this->getRowIdForPreset($tool, $userId, $title) !== self::ROWID_NOTFOUND;
    }
    
    protected function encodeArrayToString(array $theArray) : string {
        return json_encode($theArray);
    }
    
    protected function decodeStringToArray(string $theString) : array {
        return json_decode($theString, true);
    }

}
