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

namespace AverroesProject\Data;

/**
 * Basic integrity checker for the database
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class DatabaseChecker {
    
    private $settingsMgr;
    private $db;
    private $tables;
    
    const DB_VERSION = 12;
    
    public function __construct(\PDO $dbh, array $tableNames) {
        $this->db = $dbh;
        $this->tables = $tableNames;
        
    }
    
    public function isDatabaseInitialized()
    {
        // Check that all tables exist
        foreach ($this->tables as $table){
            if (!$this->tableExists($table)){
                return false;
            }
        }
        return true;
    }
    
    public function isDatabaseUpToDate()
    {
        $settingsTable = new \DataTable\MySqlDataTable($this->db, 
                $this->tables['settings']);
        if (!$settingsTable->isDbTableValid()) {
            return false;
        }
        
        $this->settingsMgr = new SettingsManager($settingsTable);
        $dbVersion = $this->settingsMgr->getSetting('dbversion');
        if ($dbVersion === false) {
            return false;
        }
        return $dbVersion == self::DB_VERSION;
    }
    
    private function tableExists($table)
    {
        $r = $this->db->query("show tables like '" . $table . "'");
        if ($r === false) {
            // This is reached only if the query above has a mistake,
            // which can't be attained solely by testing
            return false; // @codeCoverageIgnore
        }
        
        if ($r->fetch()) {
            return true;
        }
        
        return false;
    }
}
