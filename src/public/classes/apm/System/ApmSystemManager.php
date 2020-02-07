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

use APM\CollationEngine\Collatex;
use APM\CollationEngine\CollationEngine;
use APM\FullTranscription\TranscriptionManager;
use APM\Plugin\Plugin;
use APM\Presets\DataTablePresetManager;
use APM\Presets\PresetManager;
use APM\Plugin\HookManager;

use ThomasInstitut\DataTable\MySqlDataTable;
use Exception;
use InvalidArgumentException;
use Monolog\Handler\ErrorLogHandler;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use Monolog\Processor\WebProcessor;
use PDO;
use PDOException;


/**
 * This is the "production" implementation of SystemManager, with a full blown MySql database
 * and fully working sub-managers
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
    const DB_VERSION = 19;

    const DEFAULT_LOG_APPNAME = 'APM';
    const DEFAULT_LOG_DEBUG = false;
    const DEFAULT_LOG_IN_PHP_ERROR_HANDLER = true;
    const DEFAULT_TABLE_PREFIX = 'ap_';
    const DEFAULT_COLLATEX_JARFILE = 'collatex/bin/collatex-tools-1.7.1.jar';
    const DEFAULT_COLLATEX_TMPDIR = '/tmp';
    const DEFAULT_JAVA_EXECUTABLE = '/usr/bin/java';
    const DEFAULT_PLUGIN_DIR = 'plugins';
    
    const REQUIRED_CONFIG_VARIABLES = [ 
        ApmConfigParameter::APP_NAME,
        ApmConfigParameter::VERSION,
        ApmConfigParameter::COPYRIGHT_NOTICE,
        ApmConfigParameter::DB,
        ApmConfigParameter::SUPPORT_CONTACT_NAME,
        ApmConfigParameter::SUPPORT_CONTACT_EMAIL,
        ApmConfigParameter::BASE_URL,
        ApmConfigParameter::LOG_FILENAME,
        ApmConfigParameter::LANGUAGES,
        ApmConfigParameter::LANG_CODES,
    ];
    
    const REQUIRED_CONFIG_VARIABLES_DB = [ 'host', 'db', 'user', 'pwd'];
    
    /** @var array */
    private $tableNames;

    /**
     * @var DataTablePresetManager
     */
    private $presetsManager;

    /**
     * @var SettingsManager
     */
    private $settingsMgr;

    /**
     * @var HookManager
     */
    private $hookManager;

    /**
     * @var Collatex
     */
    private $collationEngine;

    /**
     * @var PDO
     */
    private $dbConn;

    /**
     * @var Logger
     */
    private $logger;
    /**
     * @var ApmTranscriptionManager
     */
    private $transcriptionManager;


    public function __construct(array $configArray) {

        $config = $this->getSanitizedConfigArray($configArray);
        
        if ($config[ApmConfigParameter::ERROR]) {
            $msg = "Configuration file is not valid:\n";
            foreach($config[ApmConfigParameter::ERROR_MESSAGES] as $errorMsg) {
                $msg .= $errorMsg . "\n";
            }
            $this->setError($msg, self::ERROR_CONFIG_ARRAY_IS_NOT_VALID);
            return;
        }
        
        parent::__construct($config);
        
        if ($this->fatalErrorOccurred()) {
            return; // @codeCoverageIgnore
        }

        // Create logger
        $this->logger = $this->createLogger();
        
        // Dump configuration warnings in the log
        foreach($this->config[ApmConfigParameter::WARNINGS] as $warning) {
            $this->logger->debug($warning);
        }
        
        // Set timezone
        date_default_timezone_set($this->config[ApmConfigParameter::DEFAULT_TIMEZONE]);
        
        // Create HookManager
        $this->hookManager = new HookManager();
        
        // Create table names
        $this->tableNames = 
                $this->createTableNames($this->config[ApmConfigParameter::TABLE_PREFIX]);
        
        // Set up database connection
        try {
            $this->dbConn = $this->setUpDbConnection();
        } catch (PDOException $e) {
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
        try {
            $settingsTable = new MySqlDataTable($this->dbConn,
                $this->tableNames[ApmMySqlTableName::TABLE_SETTINGS]);
        } catch (Exception $e) {
            // Cannot replicate this in testing, yet
            // @codeCoverageIgnoreStart
            $this->logAndSetError(self::ERROR_CANNOT_READ_SETTINGS_FROM_DB,
                "Cannot read settings from database: [ " . $e->getCode() . '] ' . $e->getMessage());
            return;
            // @codeCoverageIgnoreEnd
        }

        $this->settingsMgr = new SettingsManager($settingsTable);
        $this->settingsMgr->setSqlQueryCounterTracker($this->getSqlQueryCounterTracker());
        
        // Check that the database is up to date
        if (!$this->isDatabaseUpToDate()) {
            $this->logAndSetError(self::ERROR_DATABASE_SCHEMA_NOT_UP_TO_DATE, 
                    "Database schema not up to date");
            return;
        }
        
        // Set up Collatex
        $this->collationEngine = new Collatex(
            $this->config[ApmConfigParameter::COLLATEX_JARFILE],
            $this->config[ApmConfigParameter::COLLATEX_TMPDIR],
            $this->config[ApmConfigParameter::JAVA_EXECUTABLE]
        );
       
        // Set up PresetsManager
        $presetsManagerDataTable = new MySqlDataTable($this->dbConn,
                        $this->tableNames[ApmMySqlTableName::TABLE_PRESETS]);
        $this->presetsManager = 
                new DataTablePresetManager($presetsManagerDataTable, ['lang' => 'key1']);
        $this->presetsManager->setSqlQueryCounterTracker($this->getSqlQueryCounterTracker());

        // Set up TranscriptionManager
        $this->transcriptionManager = new ApmTranscriptionManager($this->dbConn, $this->tableNames, $this->logger);
        $this->transcriptionManager->setSqlQueryCounterTracker($this->getSqlQueryCounterTracker());
        
        // Load plugins
        foreach($this->config[ApmConfigParameter::PLUGINS] as $pluginName) {
            $pluginPhpFile = $this->config[ApmConfigParameter::PLUGIN_DIR] . '/' .
                    $pluginName . '.php';
            if ((@include_once $pluginPhpFile) === false) {
                $this->logAndSetError(self::ERROR_CANNOT_LOAD_PLUGIN, 
                        'Cannot load plugin: ' . $pluginName);
                return;
            }
            $pluginClassName = '\\' . $pluginName;
            $pluginObject = new $pluginClassName($this);
            if (is_a($pluginObject, Plugin::class)) {
                /** @var Plugin $pluginObject */
                $pluginObject->init();
            }

        }


    }
    
    
    protected function createTableNames(string $prefix) : array {
        
        $tableKeys = [
            ApmMySqlTableName::TABLE_SETTINGS,
            ApmMySqlTableName::TABLE_EDNOTES,
            ApmMySqlTableName::TABLE_ELEMENTS,
            ApmMySqlTableName::TABLE_ITEMS,
            ApmMySqlTableName::TABLE_USERS,
            ApmMySqlTableName::TABLE_TOKENS,
            ApmMySqlTableName::TABLE_RELATIONS,
            ApmMySqlTableName::TABLE_DOCS,
            ApmMySqlTableName::TABLE_PEOPLE,
            ApmMySqlTableName::TABLE_PAGES,
            ApmMySqlTableName::TABLE_PAGETYPES,
            ApmMySqlTableName::TABLE_WORKS,
            ApmMySqlTableName::TABLE_PRESETS,
            ApmMySqlTableName::TABLE_VERSIONS_TX,
        ];
        
        $tables = [];
        foreach ($tableKeys as $table) {
            $tables[$table] = $prefix . $table;
        }
        return $tables;
    }
    
    protected function setUpDbConnection() {
        $dbConfig = $this->config[ApmConfigParameter::DB];

        $dbh = new PDO('mysql:dbname='. $dbConfig['db'] . ';host=' .
                $dbConfig['host'], $dbConfig['user'], 
                $dbConfig['pwd']);
        $dbh->query("set character set 'utf8'");
        $dbh->query("set names 'utf8'");
        
        return $dbh;
    }
    
    public function getPresetsManager() : PresetManager {
        return $this->presetsManager;
    }

    public function getLogger() : Logger {
        return $this->logger;
    }
        
    public function getDbConnection() {
        return $this->dbConn;
    }
    
    public function getHookManager() : HookManager {
        return $this->hookManager;
    }
    
    public function getSettingsManager() : SettingsManager {
        return $this->settingsMgr;
    }
    
    public function getCollationEngine() : CollationEngine {
        return $this->collationEngine;
    }
    
    public function getDatabaseVersion() : int {
        return self::DB_VERSION;
    }
    
    public function getBaseUrl() : string {
        return $this->config[ApmConfigParameter::BASE_URL];
    }
    
    public function getTableNames() : array {
        return $this->tableNames;
    }

    protected function createLogger() {
        $loggerLevel = Logger::INFO;
        if ($this->config[ApmConfigParameter::LOG_DEBUG]) {
            $loggerLevel = Logger::DEBUG;
        }
        
        $logger = new Logger($this->config[ApmConfigParameter::LOG_APPNAME]);

        try {
            $logStream = new StreamHandler($this->config[ApmConfigParameter::LOG_FILENAME],
                $loggerLevel);
        } catch (Exception $e) { // @codeCoverageIgnore
            // TODO: Handle errors properly!
            return $logger;  // @codeCoverageIgnore
        }
        $logger->pushHandler($logStream);
        
        if ($this->config[ApmConfigParameter::LOG_IN_PHP_ERROR_HANDLER]) {
            // Cannot set this in testing, so, let's ignore it
            $phpLog = new ErrorLogHandler(); // @codeCoverageIgnore
            $logger->pushHandler($phpLog); // @codeCoverageIgnore
        }
        
        $logger->pushProcessor(new WebProcessor);
        
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
    
    protected function logAndSetError(int $errorCode, string $msg) {
        $this->logger->error($msg, [ 'errorCode' => $errorCode]);
        $this->setError( $msg, $errorCode);
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
        $config[ApmConfigParameter::ERROR] = false;
        $config[ApmConfigParameter::ERROR_MESSAGES] = [];
        $config[ApmConfigParameter::WARNINGS] = [];
        
        foreach (self::REQUIRED_CONFIG_VARIABLES as $requiredVariable) {
            if (!isset($config[$requiredVariable]) || ($config[$requiredVariable] === '')) {
                $config[ApmConfigParameter::ERROR] = true;
                $config[ApmConfigParameter::ERROR_MESSAGES][] = 'Missing required parameter "' .
                        $requiredVariable . '"';
            }
        }
        if ($config[ApmConfigParameter::ERROR]) {
            return $config;
        }
        
        $stringParametersWithDefaults = [
            ApmConfigParameter::DEFAULT_TIMEZONE => date_default_timezone_get(),
            ApmConfigParameter::LOG_APPNAME => self::DEFAULT_LOG_APPNAME,
            ApmConfigParameter::TABLE_PREFIX => self::DEFAULT_TABLE_PREFIX,
            ApmConfigParameter::COLLATEX_JARFILE => self::DEFAULT_COLLATEX_JARFILE,
            ApmConfigParameter::COLLATEX_TMPDIR => self::DEFAULT_COLLATEX_TMPDIR,
            ApmConfigParameter::JAVA_EXECUTABLE => self::DEFAULT_JAVA_EXECUTABLE,
            ApmConfigParameter::PLUGIN_DIR => self::DEFAULT_PLUGIN_DIR
        ];
        
        foreach($stringParametersWithDefaults as $param => $default) {
            if (!isset($config[$param]) || !is_string($config[$param]) || ($config[$param] === '')) {
                $config[$param] = $default;
                $config[ApmConfigParameter::WARNINGS][] = 'Using default for "' .
                        $param  . '" => "' . $default . '"';
            }
        }
        
        $boolParametersWithDefaults = [
            ApmConfigParameter::LOG_DEBUG => self::DEFAULT_LOG_DEBUG,
            ApmConfigParameter::LOG_IN_PHP_ERROR_HANDLER => self::DEFAULT_LOG_IN_PHP_ERROR_HANDLER
        ];
        
        foreach($boolParametersWithDefaults as $param => $default) {
            if (!isset($config[$param]) || !is_bool($config[$param])) {
                $config[$param] = $default;
                $config[ApmConfigParameter::WARNINGS][] = 'Using default for "' .
                        $param  . '" => ' . ( $default ? 'true' : 'false') ;
            }
        }
        
        // Check database configuration 
        foreach(self::REQUIRED_CONFIG_VARIABLES_DB as $requiredVariable) {
            if (!isset($config[ApmConfigParameter::DB][$requiredVariable])) {
                $config[ApmConfigParameter::ERROR] = true;
                $config[ApmConfigParameter::ERROR_MESSAGES][] = 'Missing required DB parameter: "' .
                        $requiredVariable . '"';
            } else {
                if (!is_string($config[ApmConfigParameter::DB][$requiredVariable]) ||
                        $config[ApmConfigParameter::DB][$requiredVariable] === '') {
                    $config[ApmConfigParameter::ERROR] = true;
                    $config[ApmConfigParameter::ERROR_MESSAGES][] =
                        'Required DB parameter must be an non-empty string: "' . 
                         $requiredVariable . '"';
                }
            }
        }
        
        // Make sure there's a plugins array
        if (!isset($config[ApmConfigParameter::PLUGINS]) || !is_array($config)) {
            $config[ApmConfigParameter::PLUGINS] = [];
        } 
        return $config;
    }

    /**
     * Returns the subdirectory part of a base Url
     *
     * The base url must be of the form:
     *   http<s>://somewebsite</subdir>
     *
     * where strings in <> are optional.
     *
     * For examples:  http://my.com  (subdir = '')
     *
     * or  https:/my.com/web  (subdir = 'web')
     *
     * if the given base url is wrongly formed, the function throws an InvalidArgument exception
     *
     * @return string
     */
    public function getBaseUrlSubdir() : string {

        $baseUrl = $this->getBaseUrl();

        $fields = explode('/', $baseUrl);

        /// must have at least 3 fields
        if (count($fields) <= 3) {
            throw new InvalidArgumentException('Badly formed url: ' . $baseUrl);
        }

        // $field[0] must be  http:  or https:
        if ($fields[0] !== 'http:' && $fields[0] !== 'https:') {
            throw new InvalidArgumentException('Expected http:  or https: in base Url ' . $baseUrl);
        }

        // $field[1] must be empty
        if ($fields[1] !== '') {
            throw new InvalidArgumentException('Expected // after http:');
        }

        // $field[2] is the website, not checking anything there

        // everything after $field[2] is the subdir
        if (!isset($fields[3])) {
            return '';
        }

        return '/' . implode('/', array_slice($fields, 3));
    }

    public function getTranscriptionManager(): TranscriptionManager
    {
        return $this->transcriptionManager;
    }
}
