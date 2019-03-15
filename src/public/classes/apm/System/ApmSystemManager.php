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

namespace APM\System;

use APM\Presets\DataTablePresetManager;
use AverroesProject\Data\SettingsManager;
use AverroesProject\Plugin\HookManager;

use Monolog\Logger;
use Monolog\Handler\StreamHandler;


/**
 * Description of ApmSystemManager
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ApmSystemManager extends SystemManager {
    
    const ERROR_NO_ERROR = 0;
    const ERROR_DATABASE_CONNECTION_FAILED = 1001;
    const ERROR_DATABASE_CANNOT_READ_SETTINGS = 1002;
    const ERROR_DATABASE_IS_NOT_INITIALIZED = 1003;
    const ERROR_DATABASE_SCHEMA_NOT_UP_TO_DATE  = 1004;
    
    const DB_VERSION = 16;
    
    private $presetsManager;
    private $settingsMgr;
    private $hookManager;
    private $collationEngine;
    
    private $dbConn;
    private $logger;
    
    private $config;
    
    private $errorCode;

    public function __construct($config) {
        $this->config = $config;
        $this->resetErrorCode();
        $this->logger = $this->setUpLogger();
        $this->hookManager = new HookManager();
        
        try {
            $this->dbConn = $this->setUpDbConnection();
        } catch (\PDOException $e) {
            $this->logger->error("Database connection failed: " . $e->getMessage());
            $this->errorCode = self::ERROR_DATABASE_CONNECTION_FAILED;
            return;
        }
        
        $settingsTable = new \DataTable\MySqlDataTable($this->dbConn, 
                $this->config['tables']['settings']);
        if (!$settingsTable->isDbTableValid()) {
            $this->logger->error("Cannot read settings from database");
            return;
        }
        
        $this->settingsMgr = new SettingsManager($settingsTable);
        
        if (!$this->isDatabaseInitialized()) {
            $this->logger->error("Database is not initialized");
            $this->errorCode = self::ERROR_DATABASE_IS_NOT_INITIALIZED;
            return;
        }
        
        if (!$this->isDatabaseUpToDate()) {
            $this->logger->error("Database schema not up to date");
            $this->errorCode = self::ERROR_DATABASE_SCHEMA_NOT_UP_TO_DATE;
            return;
        }
        
        $cr = new \APM\CollationEngine\Collatex(
            $config['collatex']['collatexJarFile'], 
            $config['collatex']['tmp'], 
            $config['collatex']['javaExecutable']
        );
        
        $this->collationEngine = $cr;
        
        $tableNames = $this->config['tables'];

        $presetsManagerDataTable = new \DataTable\MySqlDataTable($this->dbConn, $tableNames['presets']);
        $this->presetsManager = new DataTablePresetManager($presetsManagerDataTable);
        
    }
    
    public function resetErrorCode() {
        $this->errorCode = self::ERROR_NO_ERROR;
    }
    
    public function getErrorCode() {
        return $this->errorCode;
    }
    
    public function fatalErrorOccurred() : bool {
        return $this->errorCode !== self::ERROR_NO_ERROR;
    }
    
    public function setUpDbConnection() {
        $dbConfig = $this->config['db'];
        $dbh = new \PDO('mysql:dbname='. $dbConfig['db'] . ';host=' . 
                $dbConfig['host'], $dbConfig['user'], 
                $dbConfig['pwd']);
        $dbh->query("set character set 'utf8'");
        $dbh->query("set names 'utf8'");
        
        return $dbh;
    }
    
    public function checkSystemSetup() {
        return true;
    }

    public function getPresetsManager() {
        return $this->presetsManager;
    }
    
    public function getLogger() {
        return $this->logger;
    }
    
    public function getDbConnection() {
        return $this->dbConn;
    }
    
    public function getHookManager() {
        return $this->hookManager;
    }
    
    public function getCollationEngine() {
        return $this->collationEngine;
    }
    
    protected function setUpLogger() {
        $logStream = new StreamHandler($this->config['logfilename'], 
        Logger::DEBUG);
        $phpLog = new \Monolog\Handler\ErrorLogHandler();
        $logger = new Logger('APM');
        $logger->pushHandler($logStream);
        $logger->pushHandler($phpLog);
        $logger->pushProcessor(new \Monolog\Processor\WebProcessor);
        return $logger;
    }

    public function setUpSystem() {

    }
    
    
    public function isDatabaseInitialized()
    {
         $tables = $this->config['tables'];
        // Check that all tables exist
        foreach ($tables as $table){
            if (!$this->tableExists($table)){
                return false;
            }
        }
        return true;
    }
    
    public function isDatabaseUpToDate()
    {
        
        $dbVersion = $this->settingsMgr->getSetting('dbversion');
        if ($dbVersion === false) {
            return false;
        }
        return $dbVersion == self::DB_VERSION;
    }
    
    private function tableExists($table)
    {
        $r = $this->dbConn->query("show tables like '" . $table . "'");
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
