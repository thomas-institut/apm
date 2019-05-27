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
    
    // Error codes
    const ERROR_DATABASE_CONNECTION_FAILED = 1001;
    const ERROR_DATABASE_CANNOT_READ_SETTINGS = 1002;
    const ERROR_DATABASE_IS_NOT_INITIALIZED = 1003;
    const ERROR_DATABASE_SCHEMA_NOT_UP_TO_DATE  = 1004;
    const ERROR_CANNOT_READ_SETTINGS_FROM_DB = 1005;
    const ERROR_CANNOT_LOAD_PLUGIN = 1006;
    const ERROR_CONFIG_ARRAY_IS_NOT_VALID = 1007;
    const ERROR_BAD_DEFAULT_TIMEZONE = 1008;
    const ERROR_NO_LOGFILENAME_GIVEN = 1009;
    
    // Database version
    const DB_VERSION = 17;
    
    // Tool Ids (for presets)
    const TOOL_AUTOMATIC_COLLATION = 'automaticCollation';
    
    const VALID_TOOL_IDS = [ self::TOOL_AUTOMATIC_COLLATION];
    
    
    // MySQL table names
    const TABLE_SETTINGS = 'settings';
    const TABLE_EDNOTES = 'ednotes';
    const TABLE_ELEMENTS = 'elements';
    const TABLE_ITEMS = 'items';
    const TABLE_USERS = 'users';
    const TABLE_TOKENS = 'tokens';
    const TABLE_RELATIONS = 'relations';
    const TABLE_DOCS = 'docs';
    const TABLE_PEOPLE = 'people';
    const TABLE_PAGES = 'pages';
    const TABLE_PAGETYPES = 'types_page';
    const TABLE_WORKS = 'works';
    const TABLE_PRESETS = 'presets';

    // Configuration parameters
    const CFG_DEFAULT_TIMEZONE = 'default_timezone';
    const CFG_LOG_FILENAME = 'log_filename';
    const CFG_LOG_DEBUG = 'log_include_debug_info';
    const CFG_LOG_APPNAME = 'log_appname';
    const CFG_LOG_IN_PHP_ERROR_HANDLER = 'log_in_php_error_handler';
    const CFG_DB = 'db';
    const CFG_TABLE_PREFIX  = 'db_table_prefix';
    const CFG_COLLATEX_JARFILE = 'collatex_jar_file';
    const CFG_COLLATEX_TMPDIR = 'collatex_temp_dir';
    const CFG_JAVA_EXECUTABLE = 'java_executable';
    const CFG_PLUGIN_DIR = 'plugin_dir';
    const CFG_PLUGINS = 'plugins';
    const CFG_VERSION = 'version';
    const CFG_APP_NAME = 'app_name';
    const CFG_COPYRIGHT_NOTICE = 'copyright_notice';
    const CFG_SUPPORT_CONTACT_NAME = 'support_contact_name';
    const CFG_SUPPORT_CONTACT_EMAIL = 'support_contact_email';
    const CFG_BASE_URL = 'baseurl';
    
    const DEFAULT_LOG_APPNAME = 'APM';
    const DEFAULT_LOG_DEBUG = false;
    const DEFAULT_LOG_IN_PHP_ERROR_HANDLER = true;
    const DEFAULT_TABLE_PREFIX = 'ap_';
    const DEFAULT_COLLATEX_JARFILE = 'collatex/bin/collatex-tools-1.7.1.jar';
    const DEFAULT_COLLATEX_TMPDIR = '/tmp';
    const DEFAULT_JAVA_EXECUTABLE = '/usr/bin/java';
    const DEFAULT_PLUGIN_DIR = 'plugins';
    
    const REQUIRED_CONFIG_VARIABLES = [ 
        self::CFG_APP_NAME,
        self::CFG_VERSION,
        self::CFG_COPYRIGHT_NOTICE,
        self::CFG_DB,
        self::CFG_SUPPORT_CONTACT_NAME,
        self::CFG_SUPPORT_CONTACT_EMAIL,
        self::CFG_BASE_URL,
        'displayErrorDetails',
        self::CFG_LOG_FILENAME,
        'languages',
        'langCodes',
        'addContentLengthHeader',
    ];
    
    const REQUIRED_CONFIG_VARIABLES_DB = [ 'host', 'db', 'user', 'pwd'];
    
    /** @var array */
    private $tableNames;
    
    private $presetsManager;
    private $settingsMgr;
    private $hookManager;
    private $collationEngine;
    
    private $dbConn;
    private $logger;
  

    public function __construct(array $configArray) {

        $config = $this->getSanitizedConfigArray($configArray);
        
        if ($config['error']) {
            $msg = "Configuration file is not valid:\n";
            foreach($config['errorMsgs'] as $errorMsg) {
                $msg .= $errorMsg . "\n";
            }
            $this->setError(self::ERROR_CONFIG_ARRAY_IS_NOT_VALID, $msg);
            return;
        }
        
        parent::__construct($config);
        
        if ($this->fatalErrorOccurred()) {
            return; // @codeCoverageIgnore
        }

        // Create logger
        $this->logger = $this->createLogger();
        
        // Dump configuration warnings in the log
        foreach($this->config['warnings'] as $warning) {
            $this->logger->debug($warning);
        }
        
        // Set timezone
        date_default_timezone_set($this->config[self::CFG_DEFAULT_TIMEZONE]);    
        
        // Create HookManager
        $this->hookManager = new HookManager();
        
        // Create table names
        $this->tableNames = 
                $this->createTableNames($this->config[self::CFG_TABLE_PREFIX]);
        
        // Set up database connection
        try {
            $this->dbConn = $this->setUpDbConnection();
        } catch (\PDOException $e) {
            $this->logAndSetError(self::ERROR_DATABASE_CONNECTION_FAILED,
                    "Database connection failed: " . $e->getMessage());
            return;
        }
        
         // Check that the database is initialized 
        if (!$this->isDatabaseInitialized()) {
            $this->logAndSetError(self::ERROR_DATABASE_IS_NOT_INITIALIZED, 
                    "Database is not initialized");
            return;
        }
        
        // Set up SettingsManager
        $settingsTable = new \DataTable\MySqlDataTable($this->dbConn, 
                $this->tableNames[self::TABLE_SETTINGS]);
        if (!$settingsTable->isDbTableValid()) {
            // Cannot replicate this in testing, yet
            // @codeCoverageIgnoreStart
            $this->logAndSetError(self::ERROR_CANNOT_READ_SETTINGS_FROM_DB, 
                    "Cannot read settings from database"); 
            return; 
            // @codeCoverageIgnoreEnd
        }
        $this->settingsMgr = new SettingsManager($settingsTable);
        
        // Check that the database is up to date
        if (!$this->isDatabaseUpToDate()) {
            $this->logAndSetError(self::ERROR_DATABASE_SCHEMA_NOT_UP_TO_DATE, 
                    "Database schema not up to date");
            return;
        }
        
        // Set up Collatex
        $this->collationEngine = new \APM\CollationEngine\Collatex(
            $this->config[self::CFG_COLLATEX_JARFILE], 
            $this->config[self::CFG_COLLATEX_TMPDIR], 
            $this->config[self::CFG_JAVA_EXECUTABLE]
        );
       
        // Set up PresetsManager
        $presetsManagerDataTable = new \DataTable\MySqlDataTable($this->dbConn, 
                        $this->tableNames[self::TABLE_PRESETS]);
        $this->presetsManager = 
                new DataTablePresetManager($presetsManagerDataTable, ['lang' => 'key1']);
        
        // Load plugins
        
        foreach($this->config[self::CFG_PLUGINS] as $pluginName) {
            $pluginPhpFile = $this->config[self::CFG_PLUGIN_DIR] . '/' . 
                    $pluginName . '.php';
            if ((@include_once $pluginPhpFile) === false) {
                $this->logAndSetError(self::ERROR_CANNOT_LOAD_PLUGIN, 
                        'Cannot load plugin: ' . $pluginName);
                return;
            }
            $pluginClassName = '\\' . $pluginName;
            $pluginObject = new $pluginClassName($this);
            $pluginObject->init();
        }
    }
    
    
    protected function createTableNames(string $prefix) : array {
        
        $tableKeys = [
            self::TABLE_SETTINGS,
            self::TABLE_EDNOTES,
            self::TABLE_ELEMENTS,
            self::TABLE_ITEMS,
            self::TABLE_USERS,
            self::TABLE_TOKENS,
            self::TABLE_RELATIONS,
            self::TABLE_DOCS,
            self::TABLE_PEOPLE,
            self::TABLE_PAGES,
            self::TABLE_PAGETYPES,
            self::TABLE_WORKS,
            self::TABLE_PRESETS
        ];
        
        $tables = [];
        foreach ($tableKeys as $table) {
            $tables[$table] = $prefix . $table;
        }
        return $tables;
    }
    
    protected function setUpDbConnection() {
        $dbConfig = $this->config[self::CFG_DB];

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
    
    public function isToolValid(string $tool) : bool {
        return array_search($tool, self::VALID_TOOL_IDS) !== false;
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
    
    public function getDatabaseVersion() : int {
        return self::DB_VERSION;
    }
    
    public function getBaseUrl() : string {
        return $this->config[self::CFG_BASE_URL];
    }
    
    public function getTableNames() : array {
        return $this->tableNames;
    }

    protected function createLogger() {
        $loggerLevel = Logger::INFO;
        if ($this->config[self::CFG_LOG_DEBUG]) {
            $loggerLevel = Logger::DEBUG;
        }
        
        $logger = new Logger($this->config[self::CFG_LOG_APPNAME]);
        
        $logStream = new StreamHandler($this->config[self::CFG_LOG_FILENAME], 
                $loggerLevel);
        $logger->pushHandler($logStream);
        
        if ($this->config[self::CFG_LOG_IN_PHP_ERROR_HANDLER]) {
            // Cannot set this in testing, so, let's ignore it
            $phpLog = new \Monolog\Handler\ErrorLogHandler(); // @codeCoverageIgnore
            $logger->pushHandler($phpLog); // @codeCoverageIgnore
        }
        
        $logger->pushProcessor(new \Monolog\Processor\WebProcessor);
        
        return $logger;
    }

    protected function isDatabaseInitialized()
    {
    
        // Check that all tables exist
        foreach ($this->tableNames as $table){
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
            return false; // @codeCoverageIgnore
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
    
    /**
     * Checks a configuration array and adds defaults. 
     * Reports errors and warnings in the configuration in
     * the 'errors' and 'warnings' fields
     * @param array $originalConfig
     * @return array
     */
    protected function getSanitizedConfigArray(array $originalConfig) : array {
        
        $config = $originalConfig;
        $config['error'] = false;
        $config['errorMsgs'] = [];
        $config['warnings'] = [];
        
        foreach (self::REQUIRED_CONFIG_VARIABLES as $requiredVariable) {
            if (!isset($config[$requiredVariable]) || ($config[$requiredVariable] === '')) {
                $config['error'] = true;
                $config['errorMsgs'][] = 'Missing required parameter "' . 
                        $requiredVariable . '"';
            }
        }
        if ($config['error']) {
            return $config;
        }
        
        $stringParametersWithDefaults = [
            self::CFG_DEFAULT_TIMEZONE => date_default_timezone_get(),
            self::CFG_LOG_APPNAME => self::DEFAULT_LOG_APPNAME,
            self::CFG_TABLE_PREFIX => self::DEFAULT_TABLE_PREFIX,
            self::CFG_COLLATEX_JARFILE => self::DEFAULT_COLLATEX_JARFILE,
            self::CFG_COLLATEX_TMPDIR => self::DEFAULT_COLLATEX_TMPDIR,
            self::CFG_JAVA_EXECUTABLE => self::DEFAULT_JAVA_EXECUTABLE,
            self::CFG_PLUGIN_DIR => self::DEFAULT_PLUGIN_DIR
        ];
        
        foreach($stringParametersWithDefaults as $param => $default) {
            if (!isset($config[$param]) || !is_string($config[$param]) || ($config[$param] === '')) {
                $config[$param] = $default;
                $config['warnings'][] = 'Using default for "' . 
                        $param  . '" => "' . $default . '"';
            }
        }
        
        $boolParametersWithDefaults = [
            self::CFG_LOG_DEBUG => self::DEFAULT_LOG_DEBUG,
            self::CFG_LOG_IN_PHP_ERROR_HANDLER => self::DEFAULT_LOG_IN_PHP_ERROR_HANDLER
        ];
        
        foreach($boolParametersWithDefaults as $param => $default) {
            if (!isset($config[$param]) || !is_bool($config[$param])) {
                $config[$param] = $default;
                $config['warnings'][] = 'Using default for "' . 
                        $param  . '" => ' . ( $default ? 'true' : 'false') ;
            }
        }
        
        // Check database configuration 
        foreach(self::REQUIRED_CONFIG_VARIABLES_DB as $requiredVariable) {
            if (!isset($config[self::CFG_DB][$requiredVariable])) {
                $config['error'] = true;
                $config['errorMsgs'][] = 'Missing required DB parameter: "' . 
                        $requiredVariable . '"';
            } else {
                if (!is_string($config[self::CFG_DB][$requiredVariable]) || 
                        $config['db'][$requiredVariable] === '') {
                    $config['error'] = true;
                    $config['errorMsgs'][] = 
                        'Required DB parameter must be an non-empty string: "' . 
                         $requiredVariable . '"';
                }
            }
        }
        
        // Make sure there's a plugins array
        if (!isset($config[self::CFG_PLUGINS]) || !is_array($config)) {
            $config[self::CFG_PLUGINS] = [];
        } 
        return $config;
    }
    
    
    
    

}
