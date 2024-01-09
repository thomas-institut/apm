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
use APM\CollationEngine\DoNothingCollationEngine;
use APM\CollationTable\ApmCollationTableManager;
use APM\CollationTable\ApmCollationTableVersionManager;
use APM\CollationTable\CollationTableManager;
use APM\Core\Token\Normalizer\IgnoreArabicVocalizationNormalizer;
use APM\Core\Token\Normalizer\IgnoreIsolatedHamzaNormalizer;
use APM\Core\Token\Normalizer\IgnoreShaddaNormalizer;
use APM\Core\Token\Normalizer\IgnoreTatwilNormalizer;
use APM\Core\Token\Normalizer\RemoveHamzahMaddahFromAlifWawYahNormalizer;
use APM\Core\Token\Normalizer\ToLowerCaseNormalizer;
use APM\FullTranscription\TranscriptionManager;
use APM\Jobs\ApiSearchUpdateEditionsIndex;
use APM\Jobs\ApiSearchUpdateEditorsAndEditionsCache;
use APM\Jobs\ApiSearchUpdateTranscriptionsIndex;
use APM\Jobs\ApiSearchUpdateTranscribersAndTranscriptionsCache;
use APM\Jobs\ApiUsersUpdateCtDataForUser;
use APM\Jobs\ApiUsersUpdateTranscribedPagesData;
use APM\Jobs\ApmJobName;
use APM\Jobs\SiteChunksUpdateDataCache;
use APM\Jobs\SiteDocumentsUpdateDataCache;
use APM\MultiChunkEdition\ApmMultiChunkEditionManager;
use APM\MultiChunkEdition\MultiChunkEditionManager;
use APM\Presets\DataTablePresetManager;
use APM\Presets\PresetManager;
use APM\System\ImageSource\BilderbergImageSource;
use APM\System\ImageSource\OldBilderbergStyleRepository;
use APM\System\Job\ApmJobQueueManager;
use APM\System\Job\JobQueueManager;
use APM\System\Job\NullJobHandler;
use APM\System\Person\ApmPersonManager;
use APM\System\Person\PersonManagerInterface;
use APM\System\User\ApmUserManager;
use APM\System\User\UserManagerInterface;
use APM\ToolBox\BaseUrlDetector;
use AverroesProject\Data\DataManager;
use Exception;
use Monolog\Handler\ErrorLogHandler;
use Monolog\Handler\StreamHandler;
use Monolog\Level;
use Monolog\Logger;
use Monolog\Processor\WebProcessor;
use PDO;
use PDOException;
use Slim\Interfaces\RouteParserInterface;
use Slim\Views\Twig;
use ThomasInstitut\DataCache\DataCache;
use ThomasInstitut\DataCache\DataTableDataCache;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\DataTable\MySqlUnitemporalDataTable;
use Twig\Error\LoaderError;


/**
 * This is the "production" implementation of SystemManager, with a full-blown MySql database
 * and fully working sub-managers
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ApmSystemManager extends SystemManager {

    // Error codes
    const ERROR_DATABASE_CONNECTION_FAILED = 1001;
    const ERROR_DATABASE_IS_NOT_INITIALIZED = 1003;
    const ERROR_DATABASE_SCHEMA_NOT_UP_TO_DATE  = 1004;
    const ERROR_CANNOT_READ_SETTINGS_FROM_DB = 1005;
    const ERROR_CONFIG_ARRAY_IS_NOT_VALID = 1007;

    // Database version
    const DB_VERSION = 31;

    const REQUIRED_CONFIG_VARIABLES = [
        ApmConfigParameter::APP_NAME,
        ApmConfigParameter::VERSION,
        ApmConfigParameter::COPYRIGHT_NOTICE,
        ApmConfigParameter::DB,
        ApmConfigParameter::SUB_DIR,
        ApmConfigParameter::LOG_FILENAME,
        ApmConfigParameter::LANGUAGES,
        ApmConfigParameter::LANG_CODES,
        ApmConfigParameter::DB_TABLE_PREFIX,
        ApmConfigParameter::APM_DAEMON_PID_FILE,
        ApmConfigParameter::OPENSEARCH_HOSTS,
        ApmConfigParameter::OPENSEARCH_USER,
        ApmConfigParameter::OPENSEARCH_PASSWORD
    ];
    
    const REQUIRED_CONFIG_VARIABLES_DB = [ 'host', 'db', 'user', 'pwd'];

    protected array $serverLoggerFields = [
        'method' => 'REQUEST_METHOD',
        'url'         => 'REQUEST_URI',
        'ip'          => 'REMOTE_ADDR',
        'referrer'    => 'HTTP_REFERER',
    ];
    
    /** @var string[] */
    private array $tableNames;

    private DataTablePresetManager $presetsManager;
    private SettingsManager $settingsMgr;
    private CollationEngine $collationEngine;
    private PDO $dbConn;
    private Logger $logger;
    private ApmTranscriptionManager $transcriptionManager;
    private DataTableDataCache $systemDataCache;
    private ApmCollationTableManager $collationTableManager;
    private ?ApmMultiChunkEditionManager $multiChunkEditionManager;
    private ?Twig $twig;
    private RouteParserInterface $router;
    private ?ApmNormalizerManager $normalizerManager;
    private ?ApmUserManager $userManager;
    private ?ApmPersonManager $personManager;
    private ApmJobQueueManager $jobManager;
    protected array $imageSources;
    private ?ApmEditionSourceManager $editionSourceManager;


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

        // Create table names
        $this->tableNames = 
                $this->createTableNames($this->config[ApmConfigParameter::DB_TABLE_PREFIX]);
        
        // Set up database connection
        try {
            $this->dbConn = $this->setUpDbConnection();
        } catch (PDOException $e) {
            $this->logAndSetError(self::ERROR_DATABASE_CONNECTION_FAILED,
                    "Database connection failed: " . $e->getMessage());
            return;
        }


         // Check that the database is initialized
        // TODO: Is this check necessary?
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
        
        // Check that the database is up-to-date
        if (!$this->isDatabaseUpToDate()) {
            $this->logAndSetError(self::ERROR_DATABASE_SCHEMA_NOT_UP_TO_DATE, 
                    "Database schema not up to date");
            return;
        }

        // set up system data cache
        $this->systemDataCache = new DataTableDataCache(new MySqlDataTable($this->dbConn,
            $this->tableNames[ApmMySqlTableName::TABLE_SYSTEM_CACHE], true));
        $this->systemDataCache->setLogger($this->getLogger()->withName('CACHE'));
        
        // Set up Collation Engine
        switch($this->config[ApmConfigParameter::COLLATION_ENGINE]) {
            case ApmCollationEngine::COLLATEX:
                $this->collationEngine = new Collatex(
                    $this->config[ApmConfigParameter::COLLATEX_JAR_FILE],
                    $this->config[ApmConfigParameter::COLLATEX_TEMP_DIR],
                    $this->config[ApmConfigParameter::JAVA_EXECUTABLE]
                );
                break;
            case ApmCollationEngine::DO_NOTHING:
                $this->collationEngine = new DoNothingCollationEngine();
                break;
        }

        $this->jobManager = new ApmJobQueueManager($this,
            new MySqlDataTable($this->dbConn, $this->tableNames[ApmMySqlTableName::TABLE_JOBS], true));
        $this->jobManager->setLogger($this->logger->withName('JOB_QUEUE'));

        $this->registerSystemJobs();

//        $globalProfiler->lap("System jobs registered");
       
        // Set up PresetsManager
        $presetsManagerDataTable = new MySqlDataTable($this->dbConn,
                        $this->tableNames[ApmMySqlTableName::TABLE_PRESETS]);
        $this->presetsManager = 
                new DataTablePresetManager($presetsManagerDataTable, ['lang' => 'key1']);
        $this->presetsManager->setSqlQueryCounterTracker($this->getSqlQueryCounterTracker());

        // Set up TranscriptionManager
        $this->transcriptionManager = new ApmTranscriptionManager($this->dbConn, $this->tableNames, $this->logger);
        $this->transcriptionManager->setSqlQueryCounterTracker($this->getSqlQueryCounterTracker());
        $this->transcriptionManager->setCacheTracker($this->getCacheTracker());
        $this->transcriptionManager->setCache($this->getSystemDataCache());

//        $globalProfiler->lap("Transcription Manager ready");

        // Set up collation table manager
        $ctTable = new MySqlUnitemporalDataTable($this->dbConn, $this->tableNames[ApmMySqlTableName::TABLE_COLLATION_TABLE]);
        $ctVersionsTable = new MySqlDataTable($this->dbConn, $this->tableNames[ApmMySqlTableName::TABLE_VERSIONS_CT]);
        $ctVersionManager = new ApmCollationTableVersionManager($ctVersionsTable);
        $ctVersionManager->setLogger($this->logger);
        $ctVersionManager->setSqlQueryCounterTracker($this->getSqlQueryCounterTracker());
        $this->collationTableManager = new ApmCollationTableManager($ctTable, $ctVersionManager, $this->logger);
        $this->collationTableManager->setSqlQueryCounterTracker($this->getSqlQueryCounterTracker());

        $this->imageSources = [
            'bilderberg' => new BilderbergImageSource($this->config[ApmConfigParameter::BILDERBERG_URL]),
            'averroes-server' => new OldBilderbergStyleRepository('https://averroes.uni-koeln.de/localrep')
        ];

        $dataManager = new DataManager($this->dbConn, $this->tableNames,
            $this->logger, $this->imageSources, $this->config[ApmConfigParameter::LANG_CODES]);
        $dataManager->setSqlQueryCounterTracker($this->getSqlQueryCounterTracker());
        $dataManager->userManager->setSqlQueryCounterTracker($this->getSqlQueryCounterTracker());
        $this->dataManager = $dataManager;


        $this->twig = null;
        $this->normalizerManager = null;
        $this->multiChunkEditionManager = null;
        $this->editionSourceManager = null;
        $this->userManager = null;
        $this->personManager = null;
    }

    public function getAvailableImageSources(): array
    {
        return array_keys($this->imageSources);

    }

    /**
     * @param string $prefix
     * @return string[]
     */
    protected function  createTableNames(string $prefix) : array {
        
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
            ApmMySqlTableName::TABLE_SYSTEM_CACHE,
            ApmMySqlTableName::TABLE_JOBS,
            ApmMySqlTableName::TABLE_COLLATION_TABLE,
            ApmMySqlTableName::TABLE_VERSIONS_CT,
            ApmMySqlTableName::TABLE_MULTI_CHUNK_EDITIONS,
            ApmMySqlTableName::TABLE_EDITION_SOURCES
        ];
        
        $tables = [];
        foreach ($tableKeys as $table) {
            $tables[$table] = $prefix . $table;
        }
        return $tables;
    }
    
    protected function setUpDbConnection(): PDO
    {
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
        
    public function getDbConnection(): PDO
    {
        return $this->dbConn;
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
        return BaseUrlDetector::detectBaseUrl($this->getBaseUrlSubDir());
    }

    public function getTableNames() : array {
        return $this->tableNames;
    }

    protected function createLogger(): Logger
    {
        $loggerLevel = Level::Info;
        if ($this->config[ApmConfigParameter::LOG_INCLUDE_DEBUG_INFO]) {
            $loggerLevel = Level::Debug;
        }
        
        $logger = new Logger($this->config[ApmConfigParameter::LOG_APP_NAME]);

        try {
            $logStream = new StreamHandler($this->config[ApmConfigParameter::LOG_FILENAME],
                $loggerLevel);
        } catch (Exception) { // @codeCoverageIgnore
            // TODO: Handle errors properly!
            return $logger;  // @codeCoverageIgnore
        }
        $logger->pushHandler($logStream);
        
        if ($this->config[ApmConfigParameter::LOG_IN_PHP_ERROR_HANDLER]) {
            // Cannot set this in testing, so, let's ignore it
            $phpLog = new ErrorLogHandler(); // @codeCoverageIgnore
            $logger->pushHandler($phpLog); // @codeCoverageIgnore
        }
        
        $logger->pushProcessor(new WebProcessor(null,$this->serverLoggerFields));
        
        return $logger;
    }

    protected function isDatabaseInitialized(): bool
    {
        // Check that all tables exist
        foreach ($this->tableNames as $table){
            if (!$this->tableExists($table)){
                return false;
            }
        }
        return true;
    }
    
    protected function isDatabaseUpToDate(): bool
    {
        
        $dbVersion = $this->settingsMgr->getSetting('DatabaseVersion');
        if ($dbVersion === false) {
            return false; // @codeCoverageIgnore
        }
        return $dbVersion == self::DB_VERSION;
    }
    
    private function tableExists($table): bool
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
    
    protected function logAndSetError(int $errorCode, string $msg) : void {
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
            if (!isset($config[$requiredVariable])) {
                $config[ApmConfigParameter::ERROR] = true;
                $config[ApmConfigParameter::ERROR_MESSAGES][] = 'Missing required parameter "' .
                        $requiredVariable . '"';
            }
        }
        if ($config[ApmConfigParameter::ERROR]) {
            return $config;
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
        
        return $config;
    }

    /**
     * Returns the subdirectory part of a base Url
     * @return string
     */
    public function getBaseUrlSubDir() : string {
        return $this->config[ApmConfigParameter::SUB_DIR];
    }

    public function getTranscriptionManager(): TranscriptionManager
    {
        return $this->transcriptionManager;
    }


    public function getSystemDataCache(): DataCache
    {
        return $this->systemDataCache;
    }

    public function getCollationTableManager(): CollationTableManager
    {
        return $this->collationTableManager;
    }

    /**
     * @return Twig
     * @throws LoaderError
     */
    public function getTwig(): Twig
    {
        if (is_null($this->twig)) {
            $this->twig = Twig::create($this->config[ApmConfigParameter::TWIG_TEMPLATE_DIR],
                ['cache' => $this->config[ApmConfigParameter::TWIG_USE_CACHE]]);
        }
        return $this->twig;
    }

    public function getNormalizerManager(): NormalizerManager
    {
        if (is_null($this->normalizerManager)) {
            $this->normalizerManager = new ApmNormalizerManager();
            // Add standard normalizers
            $this->normalizerManager->registerNormalizer('la', 'standard',
                'toLowerCase', new ToLowerCaseNormalizer());
            $this->normalizerManager->setNormalizerMetadata('toLowerCase', [
                'automaticCollation' => [
                    'label' => 'Ignore Letter Case',
                    'help' => "E.g., 'Et' and 'et' will be taken to be the same word"
                ]
            ]);

            $this->normalizerManager->registerNormalizer('ar', 'standard',
                'removeHamzahMaddahFromAlifWawYah', new RemoveHamzahMaddahFromAlifWawYahNormalizer());
            $this->normalizerManager->setNormalizerMetadata('removeHamzahMaddahFromAlifWawYah', [
                'automaticCollation' => [
                    'label' => 'Ignore hamzah and maddah in ʾalif, wāw and yāʾ',
                    'help' => "آ , أ, إ &larr; ا      ؤ &larr; و      ئ &larr; ي"
                ]
            ]);

            $this->normalizerManager->registerNormalizer('ar', 'standard',
                'ignoreVocalization', new IgnoreArabicVocalizationNormalizer());
            $this->normalizerManager->setNormalizerMetadata('ignoreVocalization', [
                'automaticCollation' => [
                    'label' => 'Ignore Vocalization',
                    'help' => "Ignore vocal diacritics, e.g., الْحُرُوف &larr; الحروف"
                ]
            ]);

            $this->normalizerManager->registerNormalizer('ar', 'standard',
                'ignoreShadda', new IgnoreShaddaNormalizer());
            $this->normalizerManager->setNormalizerMetadata('ignoreShadda', [
                'automaticCollation' => [
                    'label' => 'Ignore Shaddah',
                    'help' => "Ignore shaddah, e.g., درّس &larr; درس"
                ]
            ]);

            $this->normalizerManager->registerNormalizer('ar', 'standard',
                'ignoreTatwil', new IgnoreTatwilNormalizer());
            $this->normalizerManager->setNormalizerMetadata('ignoreTatwil', [
                'automaticCollation' => [
                    'label' => 'Ignore taṭwīl',
                    'help' => "Ignore taṭwīl"
                ]
            ]);

            $this->normalizerManager->registerNormalizer('ar', 'standard',
                'ignoreIsolatedHamza', new IgnoreIsolatedHamzaNormalizer());
            $this->normalizerManager->setNormalizerMetadata('ignoreIsolatedHamza', [
                'automaticCollation' => [
                    'label' => 'Ignore isolated hamza',
                    'help' => "Ignore hamza"
                ]
            ]);
        }
        return $this->normalizerManager;
    }


    public function setRouter(RouteParserInterface $router): void
    {
        $this->router = $router;
    }

    public function getRouter(): RouteParserInterface
    {
        return $this->router;
    }

    public function getMultiChunkEditionManager(): MultiChunkEditionManager
    {
        if ($this->multiChunkEditionManager === null) {
            $mceTable = new MySqlUnitemporalDataTable($this->dbConn, $this->tableNames[ApmMySqlTableName::TABLE_MULTI_CHUNK_EDITIONS]);
            $this->multiChunkEditionManager = new ApmMultiChunkEditionManager($mceTable, $this->logger);
            $this->multiChunkEditionManager->setSqlQueryCounterTracker($this->getSqlQueryCounterTracker());
        }
        return $this->multiChunkEditionManager;
    }

    public function getEditionSourceManager(): EditionSourceManager
    {
        if (is_null($this->editionSourceManager)) {
            $table = new MySqlDataTable($this->dbConn,
                $this->tableNames[ApmMySqlTableName::TABLE_EDITION_SOURCES], true);
            $this->editionSourceManager = new ApmEditionSourceManager($table);
        }
        return $this->editionSourceManager;
    }

    public function onTranscriptionUpdated(int $userId, int $docId, int $pageNumber, int $columnNumber): void
    {
        parent::onTranscriptionUpdated($userId, $docId, $pageNumber, $columnNumber);

        $this->logger->debug("Scheduling update of SiteChunks cache");
        $this->jobManager->scheduleJob(ApmJobName::SITE_CHUNKS_UPDATE_DATA_CACHE,
            '', [],0, 3, 20);

        $this->logger->debug("Scheduling update of SiteDocuments cache");
        $this->jobManager->scheduleJob(ApmJobName::SITE_DOCUMENTS_UPDATE_DATA_CACHE,
            '',[],0, 3, 20);

        $this->logger->debug("Scheduling update of TranscribedPages cache for user $userId");
        $this->jobManager->scheduleJob(ApmJobName::API_USERS_UPDATE_TRANSCRIBED_PAGES_CACHE,
            "User $userId", ['userId' => $userId],0, 3, 20);

        $this->logger->debug("Scheduling update of open search index");
        $this->jobManager->scheduleJob(ApmJobName::API_SEARCH_UPDATE_TRANSCRIPTIONS_OPENSEARCH_INDEX,
            '', ['doc_id' => $docId, 'page' => $pageNumber, 'col' => $columnNumber],0, 3, 20);

        $this->logger->debug("Scheduling update of Transcribers cache and Titles cache");
        $this->jobManager->scheduleJob(ApmJobName::API_SEARCH_UPDATE_TRANSCRIBERS_AND_TITLES_CACHE,
            '', [], 0, 3, 20);
    }

    public function onUpdatePageSettings(int $userId, int $pageId) : void {
        parent::onUpdatePageSettings($userId, $pageId);
        $this->logger->debug("Scheduling update of TranscribedPages cache for user $userId after update of page $pageId");
        $this->jobManager->scheduleJob(ApmJobName::API_USERS_UPDATE_TRANSCRIBED_PAGES_CACHE,
            "User $userId", ['userId' => $userId],0, 3, 20);
    }

    public function onCollationTableSaved(int $userId, int $ctId): void
    {
        parent::onCollationTableSaved($userId, $ctId);
        $this->logger->debug("Invalidating CollationTablesInfo cache for user $userId");
        $this->jobManager->scheduleJob(ApmJobName::API_USERS_UPDATE_CT_INFO_CACHE,
            "User $userId", ['userId' => $userId],0, 3, 20);
        $this->jobManager->scheduleJob(ApmJobName::API_SEARCH_UPDATE_EDITIONS_OPENSEARCH_INDEX,
            '', [$ctId],0, 3, 20);
        $this->jobManager->scheduleJob(ApmJobName::API_SEARCH_UPDATE_EDITORS_AND_TITLES_CACHE,
            '', [],0, 3, 20);
    }

    public function onDocumentDeleted(int $userId, int $docId): void
    {
        parent::onDocumentDeleted($userId, $docId);

        $this->logger->debug("Scheduling update of SiteDocuments cache");
        $this->jobManager->scheduleJob(ApmJobName::SITE_DOCUMENTS_UPDATE_DATA_CACHE,
            '', [],0, 3, 20);

    }

    public function onDocumentUpdated(int $userId, int $docId): void
    {
        parent::onDocumentUpdated($userId, $docId);
        $this->logger->debug("Scheduling update of SiteDocuments cache");
        $this->jobManager->scheduleJob(ApmJobName::SITE_DOCUMENTS_UPDATE_DATA_CACHE,
            '', [],0, 3, 20);
    }

    public function onDocumentAdded(int $userId, int $docId): void
    {
        parent::onDocumentAdded($userId, $docId);
        $this->logger->debug("Scheduling update of SiteDocuments cache");
        $this->jobManager->scheduleJob(ApmJobName::SITE_DOCUMENTS_UPDATE_DATA_CACHE,
            '', [],0, 3, 20);
    }

    public function getUserManager() : UserManagerInterface {
        if ($this->userManager === null) {
            $this->userManager = new ApmUserManager(
                new MySqlDataTable($this->dbConn, $this->tableNames[ApmMySqlTableName::TABLE_USERS], true),
                new MySqlDataTable($this->dbConn, $this->tableNames[ApmMySqlTableName::TABLE_TOKENS], true)
            );
        }
        return $this->userManager;
    }

    public function getPersonManager(): PersonManagerInterface
    {
        if ($this->personManager === null) {
            $this->personManager = new ApmPersonManager(
                new MySqlDataTable($this->dbConn, $this->tableNames[ApmMySqlTableName::TABLE_PEOPLE], true),
                $this->getUserManager()
            );
        }
        return $this->personManager;
    }

    public function getJobManager(): JobQueueManager
    {
        return $this->jobManager;
    }

    private function registerSystemJobs() : void
    {
        $this->jobManager->registerJob(ApmJobName::NULL_JOB, new NullJobHandler());
        $this->jobManager->registerJob(ApmJobName::SITE_CHUNKS_UPDATE_DATA_CACHE, new SiteChunksUpdateDataCache());
        $this->jobManager->registerJob(ApmJobName::SITE_DOCUMENTS_UPDATE_DATA_CACHE, new SiteDocumentsUpdateDataCache());
        $this->jobManager->registerJob(ApmJobName::API_USERS_UPDATE_TRANSCRIBED_PAGES_CACHE, new ApiUsersUpdateTranscribedPagesData());
        $this->jobManager->registerJob(ApmJobName::API_USERS_UPDATE_CT_INFO_CACHE, new ApiUsersUpdateCtDataForUser());
        $this->jobManager->registerJob(ApmJobName::API_SEARCH_UPDATE_TRANSCRIBERS_AND_TITLES_CACHE, new ApiSearchUpdateTranscribersAndTranscriptionsCache());
        $this->jobManager->registerJob(ApmJobName::API_SEARCH_UPDATE_TRANSCRIPTIONS_OPENSEARCH_INDEX, new ApiSearchUpdateTranscriptionsIndex());
        $this->jobManager->registerJob(ApmJobName::API_SEARCH_UPDATE_EDITORS_AND_TITLES_CACHE, new ApiSearchUpdateEditorsAndEditionsCache());
        $this->jobManager->registerJob(ApmJobName::API_SEARCH_UPDATE_EDITIONS_OPENSEARCH_INDEX, new ApiSearchUpdateEditionsIndex());
    }
}
