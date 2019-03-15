<?php

/*
 *  Copyright (C) 2017 Universität zu Köln
 *  
 *  This program is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU General Public License
 *  as published by the Free Software Foundation; either version 2
 *  of the License, or (at your option) any later version.
 *   
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *  
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 *  
 */

namespace APM\System;

use DataTable\InMemoryDataTable;
/**
 * Description of SettingsManager
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class SettingsManager {
    
    /**
     *
     * @var DataTable 
     */
    private $settingsTable;
    
    public function __construct($table = false) {
        $this->settingsTable = ($table === false) 
                ? new InMemoryDataTable() 
                : $table;
    }
    
    public function getSetting(string $setting)
    {
        $row = $this->settingsTable->findRow(['setting' => $setting]);
        if ($row === false) {
            return false;
        }
        return $row['value'];
    }
    
    public function setSetting(string $setting, string $value)
    {
        $row = $this->settingsTable->findRow(['setting' => $setting]);
        if ($row == false) {
            return false !== $this->settingsTable->createRow([
                'setting' => $setting, 
                'value' => $value]);
        }
        return false !== $this->settingsTable->updateRow([ 
            'id' => $row['id'],
            'setting' => $setting, 
            'value' => $value]);
    }
}
