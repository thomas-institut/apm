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

namespace APM\System;

//use RuntimeException;
use ThomasInstitut\DataTable\DataTable;
use ThomasInstitut\DataTable\InMemoryDataTable;
//use ThomasInstitut\DataTable\InvalidRowForUpdate;
//use ThomasInstitut\DataTable\RowAlreadyExists;
//use ThomasInstitut\DataTable\RowDoesNotExist;

/**
 * Description of SettingsManager
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class SettingsManager  {

    private DataTable $settingsTable;
    
    public function __construct($table = false) {
        $this->settingsTable = ($table === false)
                ? new InMemoryDataTable() 
                : $table;
    }
    
    public function getSetting(string $setting)
    {
        $rows = $this->settingsTable->findRows(['setting' => $setting], 1);
        if (count($rows) === 0) {
            return false;
        }
        return $rows->getFirst()['value'];
    }
    
//    public function setSetting(string $setting, string $value) : bool
//    {
//
//        $rows = $this->settingsTable->findRows(['setting' => $setting], 1);
//        if (count($rows) === 0) {
//            try {
//                $this->settingsTable->createRow([
//                    'setting' => $setting,
//                    'value' => $value]);
//            } catch (RowAlreadyExists $e) {
//                // should NEVER happen
//                throw new RuntimeException($e->getMessage(), $e->getCode());
//            }
//            return true;
//        }
//        try {
//            $this->settingsTable->updateRow([
//                'id' => $rows->getFirst()['id'],
//                'setting' => $setting,
//                'value' => $value]);
//        } catch (InvalidRowForUpdate|RowDoesNotExist $e) {
//            // should NEVER happen
//            throw new RuntimeException($e->getMessage(), $e->getCode());
//        }
//        return true;
//
//    }
}
