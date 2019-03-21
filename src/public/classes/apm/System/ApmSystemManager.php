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
use APM\System\SettingsManager;
use APM\Plugin\HookManager;

use Monolog\Logger;
use Monolog\Handler\StreamHandler;


/**
 * Description of ApmSystemManager
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ApmSystemManager extends SystemManager {
    

    const ERROR_DATABASE_CONNECTION_FAILED = 1001;
    const ERROR_DATABASE_CANNOT_READ_SETTINGS = 1002;
    const ERROR_DATABASE_IS_NOT_INITIALIZED = 1003;
    const ERROR_DATABASE_SCHEMA_NOT_UP_TO_DATE  = 1004;
    const ERROR_CANNOT_READ_SETTINGS_FROM_DB = 1005;
    const ERROR_CANNOT_LOAD_PLUGIN = 1006;
    
    const DB_VERSION = 16;
    
    private $presetsManager;
    private $settingsMgr;
    private $hookManager;
    private $collationEngine;
    
    private $dbConn;
    private $logger;
  

    public function __construct(array $config) {
        parent::__construct($config);
        // Set timezone
        date_default_timezone_set($config['default_timezone']);

        $this->logger = $this->createLogger();
        $this->hookManager = new HookManager();
        

        // setup database connection
        try {
            $this->dbConn = $this->setUpDbConnection();
        } catch (\PDOException $e) {
            $this->logAndSetError(self::ERROR_DATABASE_CONNECTION_FAILED, "Database connection failed: " . $e->getMessage());
            return;
        }
        
        // setup settings manager, so that we can check the database
        $settingsTable = new \DataTable\MySqlDataTable($this->dbConn, 
                $this->config['tables']['settings']);
        if (!$settingsTable->isDbTableValid()) {
            $this->logAndSetError(self::ERROR_CANNOT_READ_SETTINGS_FROM_DB, "Cannot read settings from database");
            return;
        }
        $this->settingsMgr = new SettingsManager($settingsTable);
        
        // Check that the database is initialized and up to date
        if (!$this->isDatabaseInitialized()) {
            $this->logAndSetError(self::ERROR_DATABASE_IS_NOT_INITIALIZED, "Database is not initialized");
            return;
        }
        if (!$this->isDatabaseUpToDate()) {
            $this->logAndSetError(self::ERROR_DATABASE_SCHEMA_NOT_UP_TO_DATE, "Database schema not up to date");
            return;
        }
        
        // Set up Collatex
        $cr = new \APM\CollationEngine\Collatex(
            $config['collatex']['collatexJarFile'], 
            $config['collatex']['tmp'], 
            $config['collatex']['javaExecutable']
        );
        
        $this->collationEngine = $cr;
        
        $tableNames = $this->config['tables'];
        
        // Set up PresetsManager
        $presetsManagerDataTable = new \DataTable\MySqlDataTable($this->dbConn, $tableNames['presets']);
        $this->presetsManager = new DataTablePresetManager($presetsManagerDataTable);
        
        // Load plugins
        if (isset($config['plugins'])) {
            foreach($config['plugins'] as $pluginName) {
                $pluginPhpFile = $config['pluginDirectory'] . '/' . $pluginName . '.php';
                if ((include_once $pluginPhpFile) === false) {
                    $this->logAndSetError(self::ERROR_CANNOT_LOAD_PLUGIN, 'Cannot load plugin: ' . $pluginName);
                    return;
                }
                $pluginClassName = '\\' . $pluginName;
                $pluginObject = new $pluginClassName($this);
                $pluginObject->init();
            }
        }
        
        
    }
    
    protected function setUpDbConnection() {
        $dbConfig = $this->config['db'];
        
        $dbh = new \PDO('mysql:dbname='. $dbConfig['db'] . ';host=' . 
                $dbConfig['host'], $dbConfig['user'], 
                $dbConfig['pwd']);
        $dbh->query("set character set 'utf8'");
        $dbh->query("set names 'utf8'");
        
        return $dbh;
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
    
    public function getSettingsManager() {
        return $this->settingsMgr;
    }
    
    public function getCollationEngine() {
        return $this->collationEngine;
    }
    
    protected function createLogger() {
        $loggerLever = Logger::INFO;
        if ($this->config['logDebugInfo']) {
            $loggerLever = Logger::DEBUG;
        }
        
        $logger = new Logger($this->config['loggerAppName']);
        
        $logStream = new StreamHandler($this->config['logfilename'], $loggerLever);
        $logger->pushHandler($logStream);
        
        if ($this->config['logInPhpErrorErrorHandler']) {
            $phpLog = new \Monolog\Handler\ErrorLogHandler();
            $logger->pushHandler($phpLog);
        }
        
        $logger->pushProcessor(new \Monolog\Processor\WebProcessor);
        
        return $logger;
    }

    protected function isDatabaseInitialized()
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
    
    protected function isDatabaseUpToDate()
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
    
    protected function logAndSetError(int $errorCode, $msg) {
        $this->logger->error($msg, [ 'errorCode' => $errorCode]);
        $this->setError($errorCode, $msg);
    }

}
