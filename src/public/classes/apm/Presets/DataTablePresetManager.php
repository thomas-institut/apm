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
    
    public function addPreset(Preset $preset): bool {
        
    }

    public function eraseCorrespondingPreset(Preset $preset): bool {
        
    }

    public function getPresetsByToolAndKeys(string $tool, array $keysToMatch): array {
        
    }

    public function getPresetsByToolUserIdAndKeys(string $tool, int $userId, array $keysToMatch): array {
        
    }
    
    protected function getTableRowFromPreset(Preset $preset) : array {
        // not storing expanded keys for now
        return [ 
            self::FIELD_TOOL => $preset->getTool(), 
            self::FIELD_USERID => $preset->getUserId(),
            self::FIELD_TITLE => $preset->getTitle(),
            self::FIELD_KEYARRAY => json_encode($preset->getKeyArray()),
            self::FIELD_DATA => json_encode($preset->getData())
            ];
    }
    
    protected function getPresetFromTableRow(array $row) {
        return new Preset(
                $row[self::FIELD_TOOL], 
                $row[self::FIELD_USERID], 
                $row[self::FIELD_TITLE],
                json_decode($row[self::FIELD_KEYARRAY], true),
                json_decode($row[self::FIELD_DATA], true)
            );
    }
    
    /**
     * Returns the row Id that contains the given preset,
     * if the preset is not in the DataTable, returns self::ROWID_NOTFOUND
     * 
     * @param \APM\Presets\Preset $preset
     */
    protected function getRowIdForPreset(Preset $preset) {
        $rowToFind = $this->getTableRowFromPreset($preset);
        unset($rowToFind[self::FIELD_KEYARRAY]);
        unset($rowToFind[self::FIELD_DATA]);
        $id = $this->dataTable->findRow($rowToFind);
        if ($id === false) {
            return self::ROWID_NOTFOUND;
        }
    }

}
