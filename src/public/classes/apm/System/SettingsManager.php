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

use DataTable\DataTable;
use DataTable\InMemoryDataTable;
/**
 * Description of SettingsManager
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class SettingsManager implements SqlQueryCounterTrackerAware {

    use SimpleSqlQueryCounterTrackerAware;
    /**
     *
     * @var DataTable
     */
    private $settingsTable;
    
    public function __construct($table = false) {
        $this->initSqlQueryCounterTracker();
        $this->settingsTable = ($table === false) 
                ? new InMemoryDataTable() 
                : $table;
    }
    
    public function getSetting(string $setting)
    {
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
        $rows = $this->settingsTable->findRows(['setting' => $setting], 1);
        if ($rows === []) {
            return false;
        }
        return $rows[0]['value'];
    }
    
    public function setSetting(string $setting, string $value)
    {

        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::SELECT_COUNTER);
        $rows = $this->settingsTable->findRows(['setting' => $setting], 1);
        if ($rows === []) {
            $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::CREATE_COUNTER);
            return false !== $this->settingsTable->createRow([
                    'setting' => $setting,
                    'value' => $value]);
        }
        $this->getSqlQueryCounterTracker()->increment(SqlQueryCounterTracker::UPDATE_COUNTER);
        $this->settingsTable->updateRow([
            'id' => $rows[0]['id'],
            'setting' => $setting,
            'value' => $value]);

        return true;

    }
}
