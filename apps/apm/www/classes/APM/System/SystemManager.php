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


use APM\CollationEngine\CollationEngine;
use APM\CollationTable\CollationTableManager;
use APM\EntitySystem\ApmEntitySystemInterface;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\EntitySystem\Schema\Entity;
use APM\System\Document\DocumentManager;
use APM\System\Person\PersonManagerInterface;
use APM\System\Transcription\TranscriptionManager;
use APM\System\User\UserManagerInterface;
use APM\System\Work\WorkManager;
use Monolog\Logger;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\ContainerInterface;
use Psr\Container\NotFoundExceptionInterface;
use ThomasInstitut\DataCache\DataCache;
use ThomasInstitut\ErrorReporter\ErrorReporter;
use ThomasInstitut\ErrorReporter\SimpleErrorReporterTrait;
use ThomasInstitut\JobQueue\JobQueueManager;
use Typesense\Client;

/**
 * Integration class for putting together all the elements necessary
 * to build and operate the APM system.
 *
 * Components such as API, Site and CLI controllers should,
 * ideally, only depend on this class. This makes it possible to implement specific managers
 * for different contexts: full web application, testing, etc.
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class SystemManager implements ErrorReporter {

    use SimpleErrorReporterTrait;

    /**
     * @var array
     * @deprecated Use ApmSystemConfig from the container
     */
    protected array $config;

    protected ContainerInterface $ci;


    /**
     * @throws ContainerExceptionInterface
     * @throws NotFoundExceptionInterface
     */
    public function __construct(ContainerInterface $ci) {
        $this->resetError();
        $this->ci = $ci;
        $this->config = $ci->get(ApmContainerKey::CONFIG_ARRAY);
    }

    /**
     * @return array
     * @deprecated Use ApmSystemConfig from the container
     */
    public function getConfig() : array {
        return $this->config;
    }


    /**
     * Get methods for the different components
     */

    abstract public function getImageSources() : array;
    abstract public function getLogger() : Logger;
    abstract public function getCollationEngine(string $engineSystemId = '') : CollationEngine;

    /**
     * @return CollationTableManager
     * @deprecated Use container to get individual components
     */
    abstract public function getCollationTableManager() : CollationTableManager;

    /**
     * @return DataCache
     * @deprecated Use container to get individual components
     */
    abstract public function getSystemDataCache() : DataCache;

    /**
     * @return EditionSourceManager
     * @deprecated Use container to get individual components
     */
    abstract public function getEditionSourceManager(): EditionSourceManager;

    /**
     * @return JobQueueManager
     * @deprecated Use container to get individual components
     */
    abstract public function getJobQueueManager() : JobQueueManager;

    /**
     * @return UserManagerInterface
     * @deprecated Use container to get individual components
     */
    abstract public function getUserManager() : UserManagerInterface;

    /**
     * @return PersonManagerInterface
     * @deprecated Use container to get individual components
     */
    abstract public function getPersonManager() : PersonManagerInterface;

    /**
     * @return WorkManager
     * @deprecated Use container to get individual components
     */
    abstract public function getWorkManager() : WorkManager;

    /**
     * @return ApmEntitySystemInterface
     * @deprecated Use container to get individual components
     */
    abstract public function getEntitySystem() : ApmEntitySystemInterface;

    /**
     * @return DocumentManager
     * @deprecated Use container to get individual components
     */
    abstract public function getDocumentManager() : DocumentManager;

    /**
     * @return Client
     * @deprecated Use container to get individual components
     */
    abstract public function getTypesenseClient() : Client;


    // EVENTS
    // TODO: refactor these into event emitters and listeners

    /**
     * Event handler for changes in entity data
     * A single entity id or an array of id can be given
     *
     * @param int|array $entityIdOrIds
     * @param int $userId
     * @return void
     */
    public function onEntityDataChange(int|array $entityIdOrIds, int $userId) : void {
    }

    public function onTranscriptionUpdated(int $userTid, int $docId, int $pageNumber, int $columnNumber) : void {
    }

    public function onDocumentAdded(int $userTid, int $docId) : void {

    }
    public function onDocumentDeleted(int $userTid, int $docId) : void {

    }

    public function onDocumentUpdated(int $userTid, int $docId) : void {
    }

    public function onUpdatePageSettings(int $userTid, int $pageId) : void {

    }
    public function onCollationTableSaved(int $userTid, int $ctId) : void {
    }

    public function onPersonDataChanged(int $personTid) : void {
    }

    public function onWorkAdded(int $workId) : void {
    }

    public function onWorkDeleted(int $workId) : void {
    }

    public function onWorkUpdated(int $workId) : void {
    }

}
