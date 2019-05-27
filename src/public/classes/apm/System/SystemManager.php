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


/**
 * Integration class for putting together all the elements necessary
 * to build and operate the APM system. 
 * 
 * Having this as an abstract class makes it easy to create alternative data
 * storage schemes for testing and migration.
 * 
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class SystemManager {
    
    const ERROR_NO_ERROR = 0;
    const MSG_ERROR_NO_ERROR = 'No Error';
    
    /** @var int */
    private $errorCode;
    
    /** @var string */
    private $errorMsg;
    
    /** @var array */
    protected $config;
        
    public function __construct(array $config) {
        $this->resetErrorCode();
        $this->config = $config;
    }
    
    public function resetErrorCode() {
        $this->setError(self::ERROR_NO_ERROR, self::MSG_ERROR_NO_ERROR);
    }
    
    public function getErrorCode() : int {
        return $this->errorCode;
    }
    
    public function getErrorMsg() : string {
        return $this->errorMsg;
    }
    
    public function fatalErrorOccurred() : bool {
        return $this->errorCode !== self::ERROR_NO_ERROR;
    }
    
    public function getConfig() : array {
        return $this->config;
    }

    /**
     * Get methods for the different components
     */
    abstract public function getPresetsManager();
    abstract public function getLogger();
    abstract public function getHookManager();
    abstract public function getSettingsManager();
    
    protected function setError(int $errorCode, string $msg = '') {
        $this->errorCode = $errorCode;
        $this->errorMsg = $msg;
    }
}
