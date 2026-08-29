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
use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Schema\Entity;
use APM\Jobs\ApiSearchUpdateEditionsIndex;
use APM\Jobs\ApiSearchUpdateTranscribersAndTranscriptionsCache;
use APM\Jobs\ApiSearchUpdateTranscriptionsIndex;
use APM\Jobs\ApiUsersUpdateCtDataForUser;
use APM\Jobs\ApiUsersUpdateTranscribedPagesData;
use APM\Jobs\SiteDocumentsUpdateDataCache;
use APM\Jobs\UpdateAllPeopleDataCache;
use APM\Jobs\UpdateWorksCache;
use APM\MultiChunkEdition\MultiChunkEditionManager;
use APM\System\Cache\SystemDirDataCache;
use APM\System\Cache\SystemMemDataCache;
use APM\System\Cache\SystemMainDataCache;
use APM\System\Config\ApmSystemConfig;
use APM\System\Document\ApmDocumentManager;
use APM\System\Document\DocumentManager;
use APM\System\ImageSource\BilderbergImageSource;
use APM\System\ImageSource\OldBilderbergStyleRepository;
use APM\System\Lemmatizer\LemmatizerInterface;
use APM\System\Lemmatizer\UdPipeLemmatizer;
use APM\System\Person\EntitySystemPersonManager;
use APM\System\Person\PersonManagerInterface;
use APM\System\Preset\DataTablePresetManager;
use APM\System\Preset\PresetManager;
use APM\System\Search\SearchManagerInterface;
use APM\System\Search\TypesenseSearchManager;
use APM\System\Transcription\ApmTranscriptionManager;
use APM\System\Transcription\TranscriptionManager;
use APM\System\User\ApmUserManager;
use APM\System\User\UserManagerInterface;
use APM\System\Work\EntitySystemWorkManager;
use APM\System\Work\WorkManager;
use APM\ToolBox\BaseUrlDetector;
use APM\ToolBox\Resettable;
use Monolog\Logger;
use PDO;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Log\LoggerInterface;
use RuntimeException;
use Slim\Interfaces\RouteParserInterface;
use Slim\Views\Twig;
use ThomasInstitut\DataCache\DataCache;
use ThomasInstitut\DataTable\Exception\InvalidArgumentException;
use ThomasInstitut\DataTable\MySqlDataTable;
use ThomasInstitut\DataTable\MySqlUnitemporalDataTable;
use ThomasInstitut\DataTable\PdoProvider\PdoProvider;
use ThomasInstitut\JobQueue\JobQueueManagerInterface;
use ThomasInstitut\JobQueue\ValkeyJobQueueManager;
use Typesense\Client;
use Typesense\Exceptions\ConfigError;


/**
 * This is the "production" implementation of SystemManager
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ApmSystemManager extends SystemManager
{


    private array $imageSources;
    private LoggerInterface $logger;

    //
    // Components
    //
    // (all initialized to null)
    private ?DataTablePresetManager $presetsManager = null;
    private ?CollationEngine $collationEngine = null;
    private ?ApmTranscriptionManager $transcriptionManager = null;
    private ?ApmCollationTableManager $collationTableManager = null;
    private ?ApmNormalizerManager $normalizerManager = null;
    private ?ApmUserManager $userManager = null;
    private ?PersonManagerInterface $personManager = null;
    private ?JobQueueManagerInterface $jobManager = null;
    private ?EntitySystemEditionSourceManager $editionSourceManager = null;
    private ?WorkManager $workManager = null;
    private ?ApmDocumentManager $documentManager = null;
    private ?Client $typesenseClient = null;
    private ?UdPipeLemmatizer $lemmatizer = null;
    private ?TypesenseSearchManager $searchManager = null;

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function __construct(ContainerInterface $ci, private readonly ApmSystemConfig $systemConfig)
    {
        parent::__construct($ci);
        $this->logger = $this->ci->get(LoggerInterface::class);


        $this->imageSources = [
            Entity::ImageSourceBilderberg => new BilderbergImageSource($this->systemConfig->url->bilderberg),
            Entity::ImageSourceAverroesServer => new OldBilderbergStyleRepository($this->systemConfig->url->localImageRepository)
        ];
    }


    public function getPdoProvider(): PdoProvider
    {
        try {
            return $this->ci->get(PdoProvider::class);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface $e) {
            throw new RuntimeException('Could not get PDO provider from container: ' . $e->getMessage(), $e->getCode(), $e);
        }
    }


    public function getDbConnection(): PDO
    {
        return $this->getPdoProvider()->getPdo();
    }

    /**
     * Resets the database connection and all cached managers that depend on it.
     *
     * This forces later getter calls to recreate the connection and related managers.
     * @return void
     */
    public function resetDbConnectionAndDependentManagers(): void
    {
        $provider = $this->getPdoProvider();

        if ($provider instanceof Resettable) {
            $provider->reset();
        }

        $this->presetsManager = null;
        $this->transcriptionManager = null;
        $this->collationTableManager = null;
        $this->editionSourceManager = null;
        $this->userManager = null;
        $this->personManager = null;
        $this->workManager = null;
        $this->documentManager = null;
        $this->searchManager = null;
    }

    public function getAvailableImageSources(): array
    {
        return array_keys($this->imageSources);
    }

    public function getImageSources(): array
    {
        return $this->imageSources;
    }

    public function getPresetsManager(): PresetManager
    {
        if ($this->presetsManager === null) {
            // Set up PresetsManager
            $presetsManagerDataTable = new MySqlDataTable($this->getPdoProvider(),
                $this->getTableNames()->presets);
            $this->presetsManager =
                new DataTablePresetManager($presetsManagerDataTable, ['lang' => 'key1']);
        }
        return $this->presetsManager;
    }

    public function getLogger(): Logger
    {
        return $this->logger;
    }

    public function getCollationEngine(string $engineSystemId = ''): CollationEngine
    {
        if ($engineSystemId === ApmCollationEngine::DO_NOTHING) {
            return new DoNothingCollationEngine();
        }
        if ($this->collationEngine === null) {
            $this->collationEngine = new CollatexHttp(
                $this->config['collatexHttp']['host'],
                $this->config['collatexHttp']['port']);
            $this->collationEngine->setLogger($this->logger);
        }

        return $this->collationEngine;
    }

    public function getBaseUrl(): string
    {
        return BaseUrlDetector::detectBaseUrl($this->getBaseUrlSubDir());
    }

    public function getTableNames(): ApmTableNames
    {
        try {
            return $this->ci->get(ApmTableNames::class);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface $e) {
            throw new RuntimeException("Could not get table names: " . $e->getMessage(), $e->getCode(), $e);
        }
    }


    /**
     * Returns the subdirectory part of a base Url
     * @return string
     */
    public function getBaseUrlSubDir(): string
    {
        return $this->systemConfig->general->subDir;
    }

    public function getTranscriptionManager(): TranscriptionManager
    {
        if ($this->transcriptionManager === null) {
            // Set up TranscriptionManager
            try {
                $this->transcriptionManager = new ApmTranscriptionManager(
                    $this->ci,
                    function () {
                        return $this->getDocumentManager();
                    },
                    function () {
                        return $this->getPersonManager();
                    },
                    function () {
                        return $this->getSystemDataCache();
                    },
                );
                $this->transcriptionManager->setCache($this->getSystemDataCache());
            } catch (NotFoundExceptionInterface|ContainerExceptionInterface $e) {
                throw new RuntimeException("Failed to initialize transcription manager", 0, $e);
            }
        }
        return $this->transcriptionManager;
    }

    public function getSystemDataCache(): DataCache
    {

        try {
            return $this->ci->get(SystemMainDataCache::class);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface $e) {
            throw new RuntimeException("Could not get system data cache", 0, $e);
        }
    }

    private function getValkeyClient(): \Predis\Client
    {
        try {
            return $this->ci->get(\Predis\Client::class);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface $e) {
            throw new RuntimeException("Could not get valkey client", 0, $e);
        }
    }

    public function getMemDataCache(): DataCache
    {
        try {
            return $this->ci->get(SystemMemDataCache::class);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface $e) {
            throw new RuntimeException("Could not get mem data cache", 0, $e);
        }
    }

    public function getDirectoryDataCache(): DataCache
    {
        try {
            return $this->ci->get(SystemDirDataCache::class);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface $e) {
            throw new RuntimeException("Could not get dir data cache", 0, $e);
        }
    }

    /**
     * @throws InvalidArgumentException
     */
    public function getCollationTableManager(): CollationTableManager
    {
        if ($this->collationTableManager === null) {
            // Set up collation table manager
            $ctTable = new MySqlUnitemporalDataTable($this->getPdoProvider(), $this->getTableNames()->cTables);
            $ctVersionsTable = new MySqlDataTable($this->getPdoProvider(), $this->getTableNames()->ctVersions);
            $ctVersionManager = new ApmCollationTableVersionManager($ctVersionsTable);
            $ctVersionManager->setLogger($this->logger);
            $this->collationTableManager = new ApmCollationTableManager($ctTable, $ctVersionManager, $this->logger);
        }
        return $this->collationTableManager;
    }

    /**
     * @return Twig
     */
    public function getTwig(): Twig
    {
        try {
            return $this->ci->get(Twig::class);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface $e) {
            // should never happen
            $this->logger->error("Could not get twig", ['exception' => $e]);
            throw new RuntimeException("Could not get twig", 0, $e);
        }
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
    }

    public function getRouter(): RouteParserInterface
    {
        try {
            return $this->ci->get(RouteParserInterface::class);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface $e) {
            // should never happen
            $this->logger->error("Could not get router", ['exception' => $e]);
            throw new RuntimeException("Could not get router", 0, $e);
        }
    }


    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function getMultiChunkEditionManager(): MultiChunkEditionManager
    {
        /** @var MultiChunkEditionManager $mceManager */
        $mceManager = $this->ci->get(MultiChunkEditionManager::class);
        return $mceManager;
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

        $jobManager = $this->getJobQueueManager();

        $siteWorkUpdateCacheJobPayload = [
            'type' => 'transcription',
            'docId' => $docId,
            'pageNumber' => $pageNumber,
            'columnNumber' => $columnNumber
        ];
        $jobManager->scheduleJob(UpdateWorksCache::class,
            '', $siteWorkUpdateCacheJobPayload, 0, 3, 20);
        $jobManager->scheduleJob(SiteDocumentsUpdateDataCache::class,
            '', [$docId], 0, 3, 20);
        $jobManager->scheduleJob(ApiUsersUpdateTranscribedPagesData::class,
            "User $userTid", ['userTid' => $userTid], 0, 3, 20);
        $jobManager->scheduleJob(ApiSearchUpdateTranscriptionsIndex::class,
            '', ['doc_id' => $docId, 'page' => $pageNumber, 'col' => $columnNumber], 0, 3, 20);
        $jobManager->scheduleJob(ApiSearchUpdateTranscribersAndTranscriptionsCache::class,
            '', [], 0, 3, 20);
    }

    public function onUpdatePageSettings(int $userTid, int $pageId): void
    {
        parent::onUpdatePageSettings($userTid, $pageId);
        $this->getJobQueueManager()->scheduleJob(ApiUsersUpdateTranscribedPagesData::class,
            "User $userTid", ['userTid' => $userTid], 0, 3, 20);
    }

    public function onCollationTableSaved(int $userTid, int $ctId): void
    {
        parent::onCollationTableSaved($userTid, $ctId);
        $jobManager = $this->getJobQueueManager();
        $jobManager->scheduleJob(ApiUsersUpdateCtDataForUser::class,
            "User $userTid", ['userTid' => $userTid], 0, 3, 20);
        $jobManager->scheduleJob(ApiSearchUpdateEditionsIndex::class,
            '', [$ctId], 0, 3, 20);
        $jobManager->scheduleJob(ApiSearchUpdateTranscribersAndTranscriptionsCache::class,
            '', [], 0, 3, 20);
    }

    public function onDocumentDeleted(int $userTid, int $docId): void
    {
        parent::onDocumentDeleted($userTid, $docId);
        $this->getJobQueueManager()->scheduleJob(SiteDocumentsUpdateDataCache::class,
            '', [$docId], 0, 3, 20);

    }

    /**
     * @throws EntityDoesNotExistException
     */
    public function onEntityDataChange(int|array $entityIdOrIds, int $userId): void
    {
        parent::onEntityDataChange($entityIdOrIds, $userId);
        $entities = is_int($entityIdOrIds) ? [$entityIdOrIds] : $entityIdOrIds;
        $es = $this->getEntitySystem();

        foreach ($entities as $entity) {
            $entityType = $es->getEntityType($entity);
            switch ($entityType) {
                case Entity::tPerson:
                    $this->onPersonDataChanged($entity);
                    break;

                case Entity::tDocument:
                    $this->onDocumentUpdated($userId, $entity);
                    break;
            }
        }
    }

    public function onPersonDataChanged(int $personTid): void
    {
        parent::onPersonDataChanged($personTid);
        $part = ApiPeople::onPersonDataChanged($personTid, $this->getEntitySystem(), $this->getSystemDataCache(), $this->logger);
        $this->logger->debug("Invalidated ApiPeople data cache, part $part");
        $this->getJobQueueManager()->scheduleJob(UpdateAllPeopleDataCache::class, '', [], 0, 3, 20);
    }

    public function onDocumentUpdated(int $userTid, int $docId): void
    {
        parent::onDocumentUpdated($userTid, $docId);
        $this->getJobQueueManager()->scheduleJob(SiteDocumentsUpdateDataCache::class,
            '', [$docId], 0, 3, 20);
    }

    public function onDocumentAdded(int $userTid, int $docId): void
    {
        parent::onDocumentAdded($userTid, $docId);
        $this->getJobQueueManager()->scheduleJob(SiteDocumentsUpdateDataCache::class,
            '', [$docId], 0, 3, 20);
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

    private function getWorkAuthor(int $workId): int
    {
        try {
            $data = $this->getWorkManager()->getWorkData($workId);
        } catch (Work\WorkNotFoundException) {
            return -1;
        }
        return $data->authorId;
    }

    public function getUserManager(): UserManagerInterface
    {
        if ($this->userManager === null) {
            $this->userManager = new ApmUserManager(
                function () {
                    return new MySqlDataTable($this->getPdoProvider(), $this->getTableNames()->users, false);
                },
                function () {
                    return new MySqlDataTable($this->getPdoProvider(), $this->getTableNames()->tokens, true);
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
            $this->personManager = new EntitySystemPersonManager($this->getEntitySystem(), $this->getUserManager());
        }
        return $this->personManager;
    }

    public function getWorkManager(): WorkManager
    {
        if ($this->workManager === null) {
            $this->workManager = new EntitySystemWorkManager($this->getEntitySystem());
            $this->workManager->setLogger($this->getLogger()->withName("WorkManager"));
        }
        return $this->workManager;
    }

    public function getJobQueueManager(): JobQueueManagerInterface
    {
        $logger = $this->logger;
        if ($logger instanceof Logger) {
            $logger = $logger->withName("JOB_QUEUE");
        }
        if ($this->jobManager === null) {
            $this->jobManager = new ValkeyJobQueueManager(
                $this->getValkeyClient(),
                $logger,
                ValkeyJobQueueManager::DEFAULT_PREFIX,
                $this->ci
            );
        }
        return $this->jobManager;
    }

    public function getEntitySystem(): ApmEntitySystemInterface
    {
        try {
            return $this->ci->get(ApmEntitySystemInterface::class);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface $e) {
            $this->logger->error("Could not get entity system from container", ['exception' => $e]);
            throw new RuntimeException("Could not get entity system from container", 0, $e);
        }
    }


    public function getDocumentManager(): DocumentManager
    {
        if ($this->documentManager === null) {
            $this->documentManager = new ApmDocumentManager(
                function () {
                    return $this->getEntitySystem();
                },
                function () {
                    return new MySqlUnitemporalDataTable($this->getPdoProvider(), $this->getTableNames()->pages);
                }
            );
            $this->documentManager->setLogger($this->logger);
        }
        return $this->documentManager;
    }

    public function getTypesenseClient(): Client
    {

        if ($this->typesenseClient === null) {
            $config = $this->getConfig();
            try {
                $this->typesenseClient = new Client(
                    [
                        'api_key' => $config[ApmConfigParameter::TYPESENSE_KEY],
                        'nodes' => [
                            [
                                'host' => $config[ApmConfigParameter::TYPESENSE_HOST], // For Typesense Cloud use xxx.a1.typesense.net
                                'port' => $config[ApmConfigParameter::TYPESENSE_PORT],      // For Typesense Cloud use 443
                                'protocol' => $config[ApmConfigParameter::TYPESENSE_PROTOCOL],      // For Typesense Cloud use https
                            ],
                        ],
                        'connection_timeout_seconds' => 2,
                    ]
                );

                return $this->typesenseClient;
            } catch (ConfigError) {
                throw new RuntimeException("Typesense incorrectly configured");
            }
        }
        return $this->typesenseClient;
    }

    public function getLemmatizer(): LemmatizerInterface
    {
        if ($this->lemmatizer === null) {
            $this->lemmatizer = new UdPipeLemmatizer($this->getSystemDataCache());
        }
        return $this->lemmatizer;

    }

    public function getSearchManager(): SearchManagerInterface
    {
        if ($this->searchManager === null) {
            $this->searchManager = new TypesenseSearchManager(
                function () {
                    return $this->getTypesenseClient();
                },
                function () {
                    return $this->getSystemDataCache();
                },
                $this->getLogger()
            );
        }
        return $this->searchManager;
    }
}
