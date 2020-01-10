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
use APM\FullTranscription\TranscriptionManager;
use APM\Plugin\HookManager;
use APM\Presets\PresetManager;
use Monolog\Logger;
use ThomasInstitut\ErrorReporter\ErrorReporter;
use ThomasInstitut\ErrorReporter\SimpleErrorReporterTrait;

/**
 * Integration class for putting together all the elements necessary
 * to build and operate the APM system.
 *
 * Components such as API, Site and CLI controllers should,
 * ideally, only depends on this class. This makes it possible to implement specific managers
 * for different contexts: full web application, testing, etc.
 *
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class SystemManager implements  ErrorReporter, SqlQueryCounterTrackerAware {

    use SimpleErrorReporterTrait;
    use SimpleSqlQueryCounterTrackerAware;

    const ERROR_NO_ERROR = 0;
    const MSG_ERROR_NO_ERROR = 'No Error';

    // User roles
    const ROLE_READ_ONLY = 'readOnly';


    // Tool Ids (for presets)
    const TOOL_AUTOMATIC_COLLATION = 'automaticCollation';

    const VALID_TOOL_IDS = [ self::TOOL_AUTOMATIC_COLLATION];
    
    /** @var int */
    private $errorCode;
    
    /** @var string */
    private $errorMsg;
    
    /** @var array */
    protected $config;
        
    public function __construct(array $config) {
        $this->resetError();
        $this->config = $config;
        $this->initSqlQueryCounterTracker();
    }
    
    public function fatalErrorOccurred() : bool {
        return $this->errorCode !== self::ERROR_NO_ERROR;
    }
    
    public function getConfig() : array {
        return $this->config;
    }

    public function isToolValid(string $tool) : bool {
        return array_search($tool, self::VALID_TOOL_IDS) !== false;
    }

    /**
     * Get methods for the different components
     */
    abstract public function getPresetsManager() : PresetManager;
    abstract public function getLogger() : Logger;
    abstract public function getHookManager() : HookManager;
    abstract public function getSettingsManager() : SettingsManager;
    abstract public function getCollationEngine() : CollationEngine;
    abstract public function getTranscriptionManager() : TranscriptionManager;
    

}
