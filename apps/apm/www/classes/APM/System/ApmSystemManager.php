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
use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Schema\Entity;
use APM\System\Cache\SystemMainDataCache;
use APM\System\Config\ApmSystemConfig;
use APM\System\ImageSource\BilderbergImageSource;
use APM\System\ImageSource\OldBilderbergStyleRepository;
use APM\System\Jobs\UpdateAllPeopleDataCacheJob;
use APM\System\Jobs\UpdateApiDocumentsDataCacheJob;
use APM\System\Jobs\UpdateApiSearchEditionsIndexJob;
use APM\System\Jobs\UpdateApiSearchTranscribersAndTranscriptionsCacheJob;
use APM\System\Jobs\UpdateApiSearchTranscriptionsIndexJob;
use APM\System\Jobs\UpdateApiUsersCtDataForUserJob;
use APM\System\Jobs\UpdateApiUsersTranscribedPagesDataJob;
use APM\System\Jobs\UpdateWorksCacheJob;
use APM\System\Person\PersonManagerInterface;
use APM\System\User\UserManagerInterface;
use APM\System\Work\WorkManager;
use APM\ToolBox\Resettable;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use Psr\Log\LoggerInterface;
use RuntimeException;
use ThomasInstitut\DataTable\PdoProvider\PdoProvider;
use ThomasInstitut\JobQueue\JobQueueManager;


/**
 * This is the "production" implementation of SystemManager
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class ApmSystemManager extends SystemManager
{
    private array $imageSources;
    private LoggerInterface $logger;

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
    }

    public function getImageSources(): array
    {
        return $this->imageSources;
    }

    public function getCollationEngine(string $engineSystemId = ''): CollationEngine
    {
        if ($engineSystemId === ApmCollationEngine::DO_NOTHING) {
            return new DoNothingCollationEngine();
        }
        try {
            return $this->ci->get(CollatexHttp::class);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface $e) {
            throw new RuntimeException('CollatexHttp collation engine not found in container', 0, $e);
        }
    }

    /**
     * @return EditionSourceManager
     * @deprecated
     */
    public function getEditionSourceManager(): EditionSourceManager
    {
        try {
            return $this->ci->get(EditionSourceManager::class);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface $e) {
            throw new RuntimeException('Edition source manager not found', 0, $e);
        }
    }

    /**
     * @param int $userTid
     * @param int $docId
     * @param int $pageNumber
     * @param int $columnNumber
     * @return void
     */
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
        $jobManager->scheduleJob(UpdateWorksCacheJob::class,
            '', $siteWorkUpdateCacheJobPayload, 0, 3, 20);
        $jobManager->scheduleJob(UpdateApiDocumentsDataCacheJob::class,
            '', [$docId], 0, 3, 20);
        $jobManager->scheduleJob(UpdateApiUsersTranscribedPagesDataJob::class,
            "User $userTid", ['userTid' => $userTid], 0, 3, 20);
        $jobManager->scheduleJob(UpdateApiSearchTranscriptionsIndexJob::class,
            '', ['doc_id' => $docId, 'page' => $pageNumber, 'col' => $columnNumber], 0, 3, 20);
        $jobManager->scheduleJob(UpdateApiSearchTranscribersAndTranscriptionsCacheJob::class,
            '', [], 0, 3, 20);
    }

    public function onUpdatePageSettings(int $userTid, int $pageId): void
    {
        parent::onUpdatePageSettings($userTid, $pageId);
        $this->getJobQueueManager()->scheduleJob(UpdateApiUsersTranscribedPagesDataJob::class,
            "User $userTid", ['userTid' => $userTid], 0, 3, 20);
    }

    public function onCollationTableSaved(int $userTid, int $ctId): void
    {
        parent::onCollationTableSaved($userTid, $ctId);
        $jobManager = $this->getJobQueueManager();
        $jobManager->scheduleJob(UpdateApiUsersCtDataForUserJob::class,
            "User $userTid", ['userTid' => $userTid], 0, 3, 20);
        $jobManager->scheduleJob(UpdateApiSearchEditionsIndexJob::class,
            '', [$ctId], 0, 3, 20);
        $jobManager->scheduleJob(UpdateApiSearchTranscribersAndTranscriptionsCacheJob::class,
            '', [], 0, 3, 20);
    }

    public function onDocumentDeleted(int $userTid, int $docId): void
    {
        parent::onDocumentDeleted($userTid, $docId);
        $this->getJobQueueManager()->scheduleJob(UpdateApiDocumentsDataCacheJob::class,
            '', [$docId], 0, 3, 20);

    }

    /**
     * @param int|array $entityIdOrIds
     * @param int $userId
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     * @throws EntityDoesNotExistException
     */
    public function onEntityDataChange(int|array $entityIdOrIds, int $userId): void
    {
        parent::onEntityDataChange($entityIdOrIds, $userId);
        $entities = is_int($entityIdOrIds) ? [$entityIdOrIds] : $entityIdOrIds;
        /** @var ApmEntitySystemInterface $es */
        $es = $this->ci->get(ApmEntitySystemInterface::class);

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

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function onPersonDataChanged(int $personTid): void
    {
        parent::onPersonDataChanged($personTid);

        /** @var ApmEntitySystemInterface $es */
        $es = $this->ci->get(ApmEntitySystemInterface::class);


        /** @var SystemMainDataCache $systemDataCache */
        $systemDataCache = $this->ci->get(SystemMainDataCache::class);


        $part = ApiPeople::onPersonDataChanged($personTid, $es, $systemDataCache, $this->logger);
        $this->logger->debug("Invalidated ApiPeople data cache, part $part");
        $this->getJobQueueManager()->scheduleJob(UpdateAllPeopleDataCacheJob::class, '', [], 0, 3, 20);
    }

    public function onDocumentUpdated(int $userTid, int $docId): void
    {
        parent::onDocumentUpdated($userTid, $docId);
        $this->getJobQueueManager()->scheduleJob(UpdateApiDocumentsDataCacheJob::class,
            '', [$docId], 0, 3, 20);
    }

    public function onDocumentAdded(int $userTid, int $docId): void
    {
        parent::onDocumentAdded($userTid, $docId);
        $this->getJobQueueManager()->scheduleJob(UpdateApiDocumentsDataCacheJob::class,
            '', [$docId], 0, 3, 20);
    }

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function onWorkAdded(int $workId): void
    {
        parent::onWorkAdded($workId);
        ApiPeople::invalidateWorksByPersonCache($this->ci, $this->getWorkAuthor($workId));
    }

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function onWorkDeleted($workId): void
    {
        parent::onWorkAdded($workId);
        ApiPeople::invalidateWorksByPersonCache($this->ci, $this->getWorkAuthor($workId));
    }

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function onWorkUpdated(int $workId): void
    {
        parent::onWorkUpdated($workId);
        // TODO: find previous author and invalidate cache too!
        ApiPeople::invalidateWorksByPersonCache($this->ci, $this->getWorkAuthor($workId));
    }

    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    private function getWorkAuthor(int $workId): int
    {
        /** @var WorkManager $workManager */
        $workManager = $this->ci->get(WorkManager::class);
        try {
            $data = $workManager->getWorkData($workId);
        } catch (Work\WorkNotFoundException) {
            return -1;
        }
        return $data->authorId;
    }

    public function getUserManager(): UserManagerInterface
    {
        try {
            return $this->ci->get(UserManagerInterface::class);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface $e) {
            throw new RuntimeException('User manager not found', 0, $e);
        }
    }

    /**
     * @return PersonManagerInterface
     * @deprecated
     */
    public function getPersonManager(): PersonManagerInterface
    {
        try {
            return $this->ci->get(PersonManagerInterface::class);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface $e) {
            throw new RuntimeException('Person manager not found', 0, $e);
        }
    }

    /**
     * @return JobQueueManager
     */
    public function getJobQueueManager(): JobQueueManager
    {

        try {
            return $this->ci->get(JobQueueManager::class);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface $e) {
            throw new RuntimeException("JobQueueManager not found in container", 0, $e);
        }
    }

    /**
     * @return ApmEntitySystemInterface
     * @deprecated
     */
    public function getEntitySystem(): ApmEntitySystemInterface
    {
        try {
            return $this->ci->get(ApmEntitySystemInterface::class);
        } catch (NotFoundExceptionInterface|ContainerExceptionInterface $e) {
            $this->logger->error("Could not get entity system from container", ['exception' => $e]);
            throw new RuntimeException("Could not get entity system from container", 0, $e);
        }
    }


}
