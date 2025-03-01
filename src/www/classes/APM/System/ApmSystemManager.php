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

use APM\Api\ApiPeople;
use APM\CollationEngine\CollatexHttp;
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
use APM\EntitySystem\ApmEntitySystem;
use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Schema\Entity;
use APM\Jobs\ApiPeopleUpdateAllPeopleEssentialData;
use APM\Jobs\ApiSearchUpdateEditionsIndex;
use APM\Jobs\ApiSearchUpdateEditorsAndEditionsCache;
use APM\Jobs\ApiSearchUpdateTranscribersAndTranscriptionsCache;
use APM\Jobs\ApiSearchUpdateTranscriptionsIndex;
use APM\Jobs\ApiUsersUpdateCtDataForUser;
use APM\Jobs\ApiUsersUpdateTranscribedPagesData;
use APM\Jobs\ApmJobName;
use APM\Jobs\SiteDocumentsUpdateDataCache;
use APM\Jobs\SiteWorksUpdateDataCache;
use APM\MultiChunkEdition\ApmMultiChunkEditionManager;
use APM\MultiChunkEdition\MultiChunkEditionManager;
use APM\Session\ApmSessionManager;
use APM\Session\SessionManager;
use APM\System\Document\ApmDocumentManager;
use APM\System\Document\DocumentManager;
use APM\System\ImageSource\BilderbergImageSource;
use APM\System\ImageSource\OldBilderbergStyleRepository;
use APM\System\Job\ApmJobQueueManager;
use APM\System\Job\JobQueueManager;
use APM\System\Job\NullJobHandler;
use APM\System\Person\EntitySystemPersonManager;
use APM\System\Person\PersonManagerInterface;
use APM\System\Preset\DataTablePresetManager;
use APM\System\Preset\PresetManager;
use APM\System\Transcription\ApmTranscriptionManager;
use APM\System\Transcription\TranscriptionManager;
use APM\System\User\ApmUserManager;
use APM\System\User\UserManagerInterface;
use APM\System\Work\EntitySystemWorkManager;
use APM\System\Work\WorkManager;
use APM\ToolBox\BaseUrlDetector;
use Exception;
use Monolog\Handler\ErrorLogHandler;
use Monolog\Handler\StreamHandler;
use Monolog\Level;
use Monolog\Logger;
use Monolog\Processor\WebProcessor;
use OpenSearch\Client;
use OpenSearch\ClientBuilder;
use PDO;
use PDOException;
use RuntimeException;
use Slim\Interfaces\RouteParserInterface;
use Slim\Views\Twig;
use ThomasInstitut\DataCache\DataCache;
use ThomasInstitut\DataCache\DataTableDataCache;
use ThomasInstitut\DataCache\InMemoryDataCache;
use ThomasInstitut\DataCache\MemcachedDataCache;
use ThomasInstitut\DataCache\MultiCacheDataCache;
use ThomasInstitut\DataTable\DataTable;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\DataTable\MySqlUnitemporalDataTable;
use ThomasInstitut\EntitySystem\DataTableStatementStorage;
use ThomasInstitut\EntitySystem\EntityData;
use ThomasInstitut\EntitySystem\EntityDataCache\DataTableEntityDataCache;
use ThomasInstitut\EntitySystem\Exception\InvalidArgumentException;
use ThomasInstitut\EntitySystem\StatementStorage;
use ThomasInstitut\EntitySystem\TypedMultiStorageEntitySystem;
use ThomasInstitut\EntitySystem\TypeStorageConfig;
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
    const DB_VERSION = 37;

    // Entity system Data ID: key for entity system caches
    const ES_DATA_ID = 'es009';

    const MemCachePrefix_Apm_ES = 'apm_es';
    const MemCachePrefix_TypedMultiStorage_ES = 'apm_msEs_';

    const DefaultSystemCacheTtl = 30 * 24 * 3600;  // 30 days

    const REQUIRED_CONFIG_VARIABLES = [
        'appName',
        'version',
        'copyrightNotice',
        'db',
        'subDir',
        'log',
        'languages',
        'langCodes',
        'dbTablePrefix',
        'daemonPidFile',
        'opensearch'
    ];
    
    const REQUIRED_CONFIG_VARIABLES_DB = [ 'host', 'db', 'user', 'pwd'];

    private array $serverLoggerFields = [
        'method' => 'REQUEST_METHOD',
        'url'         => 'REQUEST_URI',
        'ip'          => 'REMOTE_ADDR',
        'referrer'    => 'HTTP_REFERER',
    ];
    
    /** @var string[] */
    private array $tableNames;
    private array $imageSources;
    private Logger $logger;
    private RouteParserInterface $router;

    //
    // Components
    //
    private ?DataTablePresetManager $presetsManager;
    private ?SettingsManager $settingsMgr;
    private ?CollationEngine $collationEngine;
    private ?PDO $dbConn;
    private ?ApmTranscriptionManager $transcriptionManager;
    private ?MultiCacheDataCache $systemDataCache;
    private ?ApmCollationTableManager $collationTableManager;
    private ?ApmMultiChunkEditionManager $multiChunkEditionManager;
    private ?Twig $twig;
    private ?ApmNormalizerManager $normalizerManager;
    private ?ApmUserManager $userManager;
    private ?PersonManagerInterface $personManager;
    private ?ApmJobQueueManager $jobManager;
    private ?EntitySystemEditionSourceManager $editionSourceManager;
    private ?WorkManager $workManager;
    private ?ApmSessionManager $sessionManager;
    private ?TypedMultiStorageEntitySystem $typedMultiStorageEntitySystem;
    private ?DataCache $memDataCache;

    private ?ApmEntitySystem $apmEntitySystem;

    private ?ApmDocumentManager $documentManager;
    private ?Client $openSearchClient = null;


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

        $this->logger = $this->createLogger();
        // Dump configuration warnings in the log
        foreach($this->config[ApmConfigParameter::WARNINGS] as $warning) {
            $this->logger->debug($warning);
        }

        // Set timezone
        date_default_timezone_set($this->config['defaultTimeZone']);

        // Create table names
        $this->tableNames = $this->createTableNames($this->config['dbTablePrefix']);

        $this->imageSources = [
            Entity::ImageSourceBilderberg => new BilderbergImageSource($this->config['url']['bilderberg']),
            Entity::ImageSourceAverroesServer => new OldBilderbergStyleRepository('https://averroes.uni-koeln.de/localrep')
        ];


        // Initialize all components to null
        $this->twig = null;
        $this->normalizerManager = null;
        $this->multiChunkEditionManager = null;
        $this->editionSourceManager = null;
        $this->userManager = null;
        $this->personManager = null;
        $this->workManager = null;
        $this->typedMultiStorageEntitySystem = null;
        $this->collationEngine = null;
        $this->dbConn = null;
        $this->systemDataCache = null;
        $this->jobManager = null;
        $this->presetsManager = null;
        $this->transcriptionManager = null;
        $this->collationTableManager = null;
        $this->sessionManager = null;
        $this->memDataCache = null;
        $this->apmEntitySystem = null;
        $this->documentManager = null;
    }


    public function getDbConnection() : PDO {
        if ($this->dbConn === null) {
            $this->logger->debug("Getting DB connection");
            // Set up database connection
            try {
                $this->dbConn = $this->setUpDbConnection();
            } catch (PDOException $e) {
                $this->logAndSetError(self::ERROR_DATABASE_CONNECTION_FAILED,
                    "Database connection failed: " . $e->getMessage());
                throw new RuntimeException("Database connection failed");
            }


            // Check that the database is initialized
            if (!$this->isDatabaseInitialized()) {
                $this->logAndSetError(self::ERROR_DATABASE_IS_NOT_INITIALIZED,
                    "Database is not initialized");
                throw new RuntimeException("Database not initialized");
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
                throw new RuntimeException("Cannot read settings from database");
                // @codeCoverageIgnoreEnd
            }

            $this->settingsMgr = new SettingsManager($settingsTable);

            // Check that the database is up-to-date
            if (!$this->isDatabaseUpToDate()) {
                $this->logAndSetError(self::ERROR_DATABASE_SCHEMA_NOT_UP_TO_DATE,
                    "Database schema not up to date");
                throw new RuntimeException("Database not up to date");
            }
        }
        return $this->dbConn;
    }

    public function getAvailableImageSources(): array
    {
        return array_keys($this->imageSources);
    }

    public function getImageSources(): array
    {
        return $this->imageSources;
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
            ApmMySqlTableName::TABLE_EDITION_SOURCES,
            ApmMySqlTableName::ES_Statements_Default,
            ApmMySqlTableName::ES_Cache_Default,
            ApmMySqlTableName::ES_Merges,
            ApmMySqlTableName::TABLE_SESSIONS_REGISTER,
            ApmMySqlTableName::TABLE_SESSIONS_LOG,
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
                $dbConfig['host'] . ':3306', $dbConfig['user'],
                $dbConfig['pwd']);
        $dbh->query("set character set 'utf8'");
        $dbh->query("set names 'utf8'");
        
        return $dbh;
    }

    public function getMemDataCache(): DataCache
    {
        if ($this->memDataCache === null) {
//            $this->memDataCache = new MemcachedDataCache();
            $this->memDataCache = new InMemoryDataCache();
        }
        return $this->memDataCache;
    }

    public function getPresetsManager() : PresetManager {
        if ($this->presetsManager === null) {
            // Set up PresetsManager
            $presetsManagerDataTable = new MySqlDataTable($this->getDbConnection(),
                $this->tableNames[ApmMySqlTableName::TABLE_PRESETS]);
            $this->presetsManager =
                new DataTablePresetManager($presetsManagerDataTable, ['lang' => 'key1']);
        }
        return $this->presetsManager;
    }

    public function getLogger() : Logger {
        return $this->logger;
    }

    public function getSettingsManager() : SettingsManager {
        return $this->settingsMgr;
    }
    
    public function getCollationEngine() : CollationEngine {

        if ($this->collationEngine === null) {
            // Set up Collation Engine
            switch($this->config['collationEngine']) {
                case ApmCollationEngine::COLLATEX_HTTP:
                    $this->collationEngine = new CollatexHttp(
                        $this->config['collatexHttp']['host'],
                        $this->config['collatexHttp']['port']);
                    break;

                case ApmCollationEngine::DO_NOTHING:
                    $this->collationEngine = new DoNothingCollationEngine();
                    break;
            }
            $this->collationEngine->setLogger($this->logger);
        }
        return $this->collationEngine;
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
        if ($this->config['log']['includeDebugInfo'] ) {
            $loggerLevel = Level::Debug;
        }
        
        $logger = new Logger($this->config['log']['appName']);

        try {
            $logStream = new StreamHandler($this->config['log']['fileName'],
                $loggerLevel);
        } catch (Exception) { // @codeCoverageIgnore
            // TODO: Handle errors properly!
            return $logger;  // @codeCoverageIgnore
        }
        $logger->pushHandler($logStream);
        
        if ($this->config['log']['inPhpErrorHandler']) {
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
        
        $dbVersion = $this->getSettingsManager()->getSetting('DatabaseVersion');
        if ($dbVersion === false) {
            return false; // @codeCoverageIgnore
        }
        return $dbVersion == self::DB_VERSION;
    }
    
    private function tableExists($table): bool
    {
        $r = $this->getDbConnection()->query("show tables like '" . $table . "'");
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
        return $this->config['subDir'];
    }

    public function getTranscriptionManager(): TranscriptionManager
    {
        if ($this->transcriptionManager === null) {
            // Set up TranscriptionManager
            $this->transcriptionManager = new ApmTranscriptionManager(
                function () { return $this->getDbConnection();},
                $this->tableNames,
                $this->logger,
                function () { return $this->getDocumentManager();},
                function () { return $this->getPersonManager();}
            );
            $this->transcriptionManager->setCache($this->getSystemDataCache());
        }
        return $this->transcriptionManager;
    }

    public function getSystemDataCache(): DataCache
    {
        if ($this->systemDataCache === null) {
            $this->systemDataCache = new MultiCacheDataCache(
                [
                    $this->getMemDataCache(),
                    function ()  {
                        $dataTableCache = new DataTableDataCache(new MySqlDataTable($this->getDbConnection(),
                            $this->tableNames[ApmMySqlTableName::TABLE_SYSTEM_CACHE], true));
                        $dataTableCache->setLogger($this->getLogger()->withName('CACHE'));
                        return $dataTableCache;
                    }
                ],
                [ 'ApmSystem_', ''],
                true
            );
            $this->systemDataCache->setLogger($this->getLogger());
            $this->systemDataCache->setDefaultTtl(self::DefaultSystemCacheTtl);
        }

        return $this->systemDataCache;
    }

    public function getCollationTableManager(): CollationTableManager
    {
        if ($this->collationTableManager === null) {
            // Set up collation table manager
            $ctTable = new MySqlUnitemporalDataTable($this->getDbConnection(), $this->tableNames[ApmMySqlTableName::TABLE_COLLATION_TABLE]);
            $ctVersionsTable = new MySqlDataTable($this->getDbConnection(), $this->tableNames[ApmMySqlTableName::TABLE_VERSIONS_CT]);
            $ctVersionManager = new ApmCollationTableVersionManager($ctVersionsTable);
            $ctVersionManager->setLogger($this->logger);
            $this->collationTableManager = new ApmCollationTableManager($ctTable, $ctVersionManager, $this->logger);
        }
        return $this->collationTableManager;
    }

    /**
     * @return Twig
     * @throws LoaderError
     */
    public function getTwig(): Twig
    {
        if ($this->twig === null) {
            $this->twig = Twig::create('templates');
        }
        return $this->twig;
    }

    public function getNormalizerManager(): NormalizerManager
    {
        if ($this->normalizerManager === null) {
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
            $mceTable = new MySqlUnitemporalDataTable($this->getDbConnection(), $this->tableNames[ApmMySqlTableName::TABLE_MULTI_CHUNK_EDITIONS]);
            $this->multiChunkEditionManager = new ApmMultiChunkEditionManager($mceTable, $this->logger);
        }
        return $this->multiChunkEditionManager;
    }

    public function getEditionSourceManager(): EditionSourceManager
    {
        if (is_null($this->editionSourceManager)) {

            $this->editionSourceManager = new EntitySystemEditionSourceManager(function () {
                return $this->getEntitySystem();
            });
        }
        return $this->editionSourceManager;
    }

    public function onTranscriptionUpdated(int $userTid, int $docId, int $pageNumber, int $columnNumber): void
    {
        parent::onTranscriptionUpdated($userTid, $docId, $pageNumber, $columnNumber);

        $jobManager = $this->getJobManager();

        $this->logger->debug("Scheduling update of SiteChunks cache");
        $jobManager->scheduleJob(ApmJobName::SITE_CHUNKS_UPDATE_DATA_CACHE,
            '', [],0, 3, 20);

        $this->logger->debug("Scheduling update of SiteDocuments cache");
        $jobManager->scheduleJob(ApmJobName::SITE_DOCUMENTS_UPDATE_DATA_CACHE,
            '',[],0, 3, 20);

        $this->logger->debug("Scheduling update of TranscribedPages cache for user $userTid");
        $jobManager->scheduleJob(ApmJobName::API_USERS_UPDATE_TRANSCRIBED_PAGES_CACHE,
            "User $userTid", ['userTid' => $userTid],0, 3, 20);

        $this->logger->debug("Scheduling update of open search index");
        $jobManager->scheduleJob(ApmJobName::API_SEARCH_UPDATE_TRANSCRIPTIONS_OPENSEARCH_INDEX,
            '', ['doc_id' => $docId, 'page' => $pageNumber, 'col' => $columnNumber],0, 3, 20);

        $this->logger->debug("Scheduling update of Transcribers cache and Titles cache");
        $jobManager->scheduleJob(ApmJobName::API_SEARCH_UPDATE_TRANSCRIBERS_AND_TITLES_CACHE,
            '', [], 0, 3, 20);
    }

    public function onUpdatePageSettings(int $userTid, int $pageId) : void {
        parent::onUpdatePageSettings($userTid, $pageId);
        $this->logger->debug("Scheduling update of TranscribedPages cache for user $userTid after update of page $pageId");
        $this->getJobManager()->scheduleJob(ApmJobName::API_USERS_UPDATE_TRANSCRIBED_PAGES_CACHE,
            "User $userTid", ['userTid' => $userTid],0, 3, 20);
    }

    public function onCollationTableSaved(int $userTid, int $ctId): void
    {
        parent::onCollationTableSaved($userTid, $ctId);
        $jobManager = $this->getJobManager();
        $this->logger->debug("Invalidating CollationTablesInfo cache for user $userTid");
        $jobManager->scheduleJob(ApmJobName::API_USERS_UPDATE_CT_INFO_CACHE,
            "User $userTid", ['userTid' => $userTid],0, 3, 20);
        $jobManager->scheduleJob(ApmJobName::API_SEARCH_UPDATE_EDITIONS_OPENSEARCH_INDEX,
            '', [$ctId],0, 3, 20);
        $jobManager->scheduleJob(ApmJobName::API_SEARCH_UPDATE_EDITORS_AND_TITLES_CACHE,
            '', [],0, 3, 20);
    }

    public function onDocumentDeleted(int $userTid, int $docId): void
    {
        parent::onDocumentDeleted($userTid, $docId);

        $this->logger->debug("Scheduling update of SiteDocuments cache");
        $this->getJobManager()->scheduleJob(ApmJobName::SITE_DOCUMENTS_UPDATE_DATA_CACHE,
            '', [],0, 3, 20);

    }

    /**
     * @throws EntityDoesNotExistException
     */
    public function onEntityDataChange(int|array $entityIdOrIds): void
    {
        parent::onEntityDataChange($entityIdOrIds);
        $entities = is_int($entityIdOrIds) ? [ $entityIdOrIds] : $entityIdOrIds;
        $es = $this->getEntitySystem();

        foreach ($entities as $entity) {
            if ($es->getEntityType($entity) === Entity::tPerson) {
                $this->onPersonDataChanged($entity);
                break;
            }
        }
    }

    public function onPersonDataChanged(int $personTid): void
    {
        parent::onPersonDataChanged($personTid);
        $part = ApiPeople::onPersonDataChanged($personTid, $this->getEntitySystem(), $this->getSystemDataCache(), $this->logger);
        $this->logger->debug("Invalidated ApiPeople data cache, part $part");
        $this->logger->debug("Scheduling update to ApiPeople data cache, all");
        $this->getJobManager()->scheduleJob(ApmJobName::API_PEOPLE_UPDATE_CACHE, '', [], 0, 3, 20);
    }

    public function onDocumentUpdated(int $userTid, int $docId): void
    {
        parent::onDocumentUpdated($userTid, $docId);
        $this->logger->debug("Scheduling update of SiteDocuments cache");
        $this->getJobManager()->scheduleJob(ApmJobName::SITE_DOCUMENTS_UPDATE_DATA_CACHE,
            '', [],0, 3, 20);
    }

    public function onDocumentAdded(int $userTid, int $docId): void
    {
        parent::onDocumentAdded($userTid, $docId);
        $this->logger->debug("Scheduling update of SiteDocuments cache");
        $this->getJobManager()->scheduleJob(ApmJobName::SITE_DOCUMENTS_UPDATE_DATA_CACHE,
            '', [],0, 3, 20);
    }

    public function onWorkAdded(int $workId): void
    {
        parent::onWorkAdded($workId);
        ApiPeople::invalidateWorksByPersonCache($this, $this->getWorkAuthor($workId));
    }

    public function onWorkDeleted($workId): void
    {
        parent::onWorkAdded($workId);
        ApiPeople::invalidateWorksByPersonCache($this, $this->getWorkAuthor($workId));
    }

    public function onWorkUpdated(int $workId): void
    {
        parent::onWorkUpdated($workId);
        // TODO: find previous author and invalidate cache too!
        ApiPeople::invalidateWorksByPersonCache($this, $this->getWorkAuthor($workId));
    }

    private function getWorkAuthor(int $workId) : int {
        try {
            $data = $this->getWorkManager()->getWorkData($workId);
        } catch (Work\WorkNotFoundException $e) {
            return -1;
        }
        return $data->authorId;
    }

    public function getUserManager() : UserManagerInterface {
        if ($this->userManager === null) {
//            $this->logger->debug("Creating UserManager");
            $this->userManager = new ApmUserManager(
                function () {
//                    $this->logger->debug("Creating Users DataTable");
                    return new MySqlDataTable($this->getDbConnection(), $this->tableNames[ApmMySqlTableName::TABLE_USERS], false);
                },
                function () {
//                    $this->logger->debug("Creating UserTokens DataTable");
                    return new MySqlDataTable($this->getDbConnection(), $this->tableNames[ApmMySqlTableName::TABLE_TOKENS], true);
                },
                $this->getSystemDataCache(),
                'ApmUM_'
            );
        }
        return $this->userManager;
    }

    public function getPersonManager(): PersonManagerInterface
    {
        if ($this->personManager === null) {
//            $this->logger->debug("Creating PersonManager");
            $this->personManager = new EntitySystemPersonManager($this->getEntitySystem(), $this->getUserManager());
        }
        return $this->personManager;
    }

    public function getWorkManager(): WorkManager
    {
        if ($this->workManager === null) {
//            $this->logger->debug("Creating WorkManager");
//            $this->workManager = new DataTableWorkManager(
//                new MySqlDataTable($this->getDbConnection(),
//                    $this->tableNames[ApmMySqlTableName::TABLE_WORKS], true));

            $this->workManager = new EntitySystemWorkManager($this->getEntitySystem());
            $this->workManager->setLogger($this->getLogger()->withName("WorkManager"));
        }
        return $this->workManager;
    }

    public function getJobManager(): JobQueueManager
    {
        if ($this->jobManager === null) {
//            $this->logger->debug("Creating Job manager");
            $this->jobManager = new ApmJobQueueManager($this,
                new MySqlDataTable($this->getDbConnection(), $this->tableNames[ApmMySqlTableName::TABLE_JOBS], true));
            $this->jobManager->setLogger($this->logger->withName('JOB_QUEUE'));
            $this->registerSystemJobs();
        }
        return $this->jobManager;
    }

    private function registerSystemJobs() : void
    {
        $this->jobManager->registerJob(ApmJobName::NULL_JOB, new NullJobHandler());
        $this->jobManager->registerJob(ApmJobName::SITE_CHUNKS_UPDATE_DATA_CACHE, new SiteWorksUpdateDataCache());
        $this->jobManager->registerJob(ApmJobName::SITE_DOCUMENTS_UPDATE_DATA_CACHE, new SiteDocumentsUpdateDataCache());
        $this->jobManager->registerJob(ApmJobName::API_PEOPLE_UPDATE_CACHE, new ApiPeopleUpdateAllPeopleEssentialData());
        $this->jobManager->registerJob(ApmJobName::API_USERS_UPDATE_TRANSCRIBED_PAGES_CACHE, new ApiUsersUpdateTranscribedPagesData());
        $this->jobManager->registerJob(ApmJobName::API_USERS_UPDATE_CT_INFO_CACHE, new ApiUsersUpdateCtDataForUser());
        $this->jobManager->registerJob(ApmJobName::API_SEARCH_UPDATE_TRANSCRIBERS_AND_TITLES_CACHE, new ApiSearchUpdateTranscribersAndTranscriptionsCache());
        $this->jobManager->registerJob(ApmJobName::API_SEARCH_UPDATE_TRANSCRIPTIONS_OPENSEARCH_INDEX, new ApiSearchUpdateTranscriptionsIndex());
        $this->jobManager->registerJob(ApmJobName::API_SEARCH_UPDATE_EDITORS_AND_TITLES_CACHE, new ApiSearchUpdateEditorsAndEditionsCache());
        $this->jobManager->registerJob(ApmJobName::API_SEARCH_UPDATE_EDITIONS_OPENSEARCH_INDEX, new ApiSearchUpdateEditionsIndex());
    }

    public function getEntitySystem(): ApmEntitySystemInterface
    {
        if ($this->apmEntitySystem === null) {
//            $this->logger->debug("Creating entity system");
            $this->apmEntitySystem = new ApmEntitySystem(
                function () : TypedMultiStorageEntitySystem{
                    return $this->getRawEntitySystem();
                },
                function () : DataTable {
//                    $this->logger->debug("Creating merges datatable");
                    return new MySqlDataTable($this->getDbConnection(), $this->tableNames[ApmMySqlTableName::ES_Merges], true);
                },
                $this->getMemDataCache(),
                self::MemCachePrefix_Apm_ES
            );
            $this->apmEntitySystem->setLogger($this->logger);
        }
        return $this->apmEntitySystem;
    }

    public function createDefaultStatementStorage() : StatementStorage {
        $defaultStatementDataTable = new MySqlDataTable($this->getDbConnection(),
            $this->tableNames[ApmMySqlTableName::ES_Statements_Default]);
        return new DataTableStatementStorage($defaultStatementDataTable, [
            'author' => Entity::pStatementAuthor,
            "timestamp" => [ 'predicate' => Entity::pStatementTimestamp, 'forceLiteralValue' => true ],
            'edNote'=> Entity::pStatementEditorialNote,
            'cancelledBy' => [ 'predicate' => Entity::pCancelledBy, 'cancellationMetadata' => true ],
            'cancellationTs' => [ 'predicate' => Entity::pCancellationTimestamp, 'cancellationMetadata' => true, 'forceLiteralValue' => true  ],
        ]);
    }



    /**
     * @inheritDoc
     */
    public function getRawEntitySystem(): TypedMultiStorageEntitySystem
    {
        if ($this->typedMultiStorageEntitySystem === null) {
//            $this->logger->debug("Creating inner entity system");

            $defaultConfig = new TypeStorageConfig();
            $defaultConfig->withType(0);
            $defaultConfig->statementStorageCallable = function () {
//                $this->logger->debug("Creating default statement storage");
                return $this->createDefaultStatementStorage();
            };
            $defaultConfig->useCache = true;
            $defaultConfig->entityDataCacheCallable = function () {
//                $this->logger->debug("Creating default entity data cache datatable");
                $defaultEntityDataCacheDataTable = new MySqlDataTable($this->getDbConnection(), $this->tableNames[ApmMySqlTableName::ES_Cache_Default]);
                return new DataTableEntityDataCache(
                    $defaultEntityDataCacheDataTable,
                    [
                        'name' => function(EntityData $entityData) {
                            return $entityData->getObjectForPredicate(Entity::pEntityName);
                        },
                        'type' =>
                            function (EntityData $entityData) {
                                return $entityData->getObjectForPredicate(Entity::pEntityType);
                            }
                    ]
                );
            };

            $defaultConfig->useMemCache = true;

            try {
                $this->typedMultiStorageEntitySystem = new TypedMultiStorageEntitySystem(
                    Entity::pEntityType, [$defaultConfig],
                    self::ES_DATA_ID,
                    $this->getMemDataCache(),
                    self::MemCachePrefix_TypedMultiStorage_ES . self::ES_DATA_ID
                );
                $this->typedMultiStorageEntitySystem->setLogger($this->logger);
            } catch (InvalidArgumentException) {
                throw new RuntimeException("Bad entity system configuration");
            }
        }
        return $this->typedMultiStorageEntitySystem;
    }

    public function getSessionManager(): SessionManager
    {
        if ($this->sessionManager === null) {
            $sessionsTable = new MySqlDataTable($this->getDbConnection(),
                $this->getTableNames()[ApmMySqlTableName::TABLE_SESSIONS_REGISTER], true);
            $logTable = new MySqlDataTable($this->getDbConnection(),
                $this->getTableNames()[ApmMySqlTableName::TABLE_SESSIONS_LOG], true);
            $this->sessionManager = new ApmSessionManager($sessionsTable, $logTable, $this->logger);
        }
        return $this->sessionManager;
    }

    public function getDocumentManager(): DocumentManager
    {
        if ($this->documentManager === null) {
            $this->documentManager = new ApmDocumentManager(
                function () {
                    return $this->getEntitySystem();
                },
                function () {
                    return new MySqlUnitemporalDataTable($this->getDbConnection(), $this->tableNames[ApmMySqlTableName::TABLE_PAGES]);
                }
            );
            $this->documentManager->setLogger($this->logger);
        }
        return $this->documentManager;
    }

    public function getOpensearchClient(): Client|null
    {
        if ($this->openSearchClient === null) {
            try {
                $config = $this->getConfig();
                $builder = new ClientBuilder();
                $builder->setHosts($config['opensearch']['hosts']);
                $user = $config['opensearch']['user'] ?? '';
                $password = $config['opensearch']['password'] ?? '';
                if ($user !== '' && $password !== '') {
                    $builder->setBasicAuthentication($user, $password);
                }
                $builder->setSSLVerification(false);
                $this->openSearchClient = $builder->build();
            } catch (Exception $e) {
                $this->logger->error("Error creating opensearch client: " . $e->getMessage());
                return null;
            }
        }

        return $this->openSearchClient;
    }
}
