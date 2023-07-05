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
use APM\MultiChunkEdition\MultiChunkEditionManager;
use APM\FullTranscription\ApmTranscriptionWitness;
use APM\FullTranscription\TranscriptionManager;
use APM\Plugin\HookManager;
use APM\Presets\PresetManager;
use APM\System\Job\JobQueueManager;
use AverroesProject\Data\DataManager;
use Monolog\Logger;
use Slim\Interfaces\RouteParserInterface;
use Slim\Views\Twig;
use ThomasInstitut\DataCache\DataCache;
use ThomasInstitut\ErrorReporter\ErrorReporter;
use ThomasInstitut\ErrorReporter\SimpleErrorReporterTrait;
use ThomasInstitut\Profiler\CacheTrackerAware;
use ThomasInstitut\Profiler\SimpleCacheTrackerAware;
use ThomasInstitut\Profiler\SimpleSqlQueryCounterTrackerAware;
use ThomasInstitut\Profiler\SqlQueryCounterTrackerAware;

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
abstract class SystemManager implements ErrorReporter, SqlQueryCounterTrackerAware, CacheTrackerAware {

    use SimpleErrorReporterTrait;
    use SimpleSqlQueryCounterTrackerAware;
    use SimpleCacheTrackerAware;

    const ERROR_NO_ERROR = 0;

    // User roles
    const ROLE_READ_ONLY = 'readOnly';


    // Tool Ids (for presets)
    const TOOL_AUTOMATIC_COLLATION_V1 = 'automaticCollation';
    const TOOL_AUTOMATIC_COLLATION = 'automaticCollation_v2';
    const TOOL_SIGLA = 'sigla';

    const VALID_TOOL_IDS = [ self::TOOL_AUTOMATIC_COLLATION];
    
    /** @var array */
    protected array $config;

    /**
     * @var DataManager
     */
    private DataManager $dataManager;

    public function __construct(array $config) {
        $this->resetError();
        $this->config = $config;
        $this->initSqlQueryCounterTracker();
        $this->initCacheTracker();
    }
    
    public function fatalErrorOccurred() : bool {
        return $this->errorCode !== self::ERROR_NO_ERROR;
    }
    
    public function getConfig() : array {
        return $this->config;
    }

    public function isToolValid(string $tool) : bool {
        return in_array($tool, self::VALID_TOOL_IDS);
    }

    /**
     * Set and get method for DataManager
     * Eventually this will be replaced by proper subcomponents. The idea for the
     * time being is to make SystemManager the only dependency for system operation
     */

    /**
     * @param DataManager $dm
     */
    public function setDataManager(DataManager $dm): void {
        $this->dataManager = $dm;
    }

    public function getDataManager() : DataManager {
        return $this->dataManager;
    }

    /**
     * Set methods
     */

    /**
     * @param RouteParserInterface $router
     */
    abstract public function setRouter(RouteParserInterface $router) : void;


    /**
     * Get methods for the different components
     */
    abstract public function getPresetsManager() : PresetManager;
    abstract public function getLogger() : Logger;
    abstract public function getHookManager() : HookManager;
    abstract public function getSettingsManager() : SettingsManager;
    abstract public function getCollationEngine() : CollationEngine;
    abstract public function getTranscriptionManager() : TranscriptionManager;
    abstract public function getCollationTableManager() : CollationTableManager;
    abstract public function getMultiChunkEditionManager() : MultiChunkEditionManager;
    abstract public function getSystemDataCache() : DataCache;
    abstract public function getBaseUrl(): string;
    abstract public function getTwig() : Twig;
    abstract public function getRouter() : RouteParserInterface;
    abstract public function getNormalizerManager() : NormalizerManager;
    abstract public function getOpenSearchScheduler() : OpenSearchScheduler;
    abstract public function getEditionSourceManager(): EditionSourceManager;

    abstract public function getJobManager() : JobQueueManager;

    public function getFullTxWitnessId(ApmTranscriptionWitness $witness) : string {
        return WitnessSystemId::buildFullTxId(
            $witness->getWorkId(),
            $witness->getChunk(),
            $witness->getDocId(),
            $witness->getLocalWitnessId(),
            $witness->getTimeStamp()
        );
    }


    // EVENTS
    // Instead of a generic event handler, for the sake of clean(ish) development
    // it's better to explicitly define here all the internal events generated by
    // the system.
    // By default, don't do anything

    public function onTranscriptionUpdated(int $userId, int $docId, int $pageNumber, int $columnNumber) : void {
    }

    public function onDocumentAdded(int $userId, int $docId) : void {

    }
    public function onDocumentDeleted(int $userId, int $docId) : void {

    }

    public function onDocumentUpdated(int $userId, int $docId) : void {
    }

    public function onUpdatePageSettings(int $userId, int $pageId) : void {

    }



    public function onCollationTableSaved(int $userId, int $ctId) : void {

    }
}
