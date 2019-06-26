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

namespace APM\CollationEngine;

/**
 * Abstraction of a collation engine such as Collatex
 * 
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
abstract class CollationEngine {
    
    const ERROR_NOERROR=0;

    const DEFAULT_COLLATION_ENGINE = 'Generic Collation Engine';
    
    /** @var float */
    private $duration;
    /** @var int */
    private $errorCode;
    /** @var string */
    private $errorContext;
    /** @var float */
    private $startMicroTime;
    /** @var float */
    private $endMicroTime;
    /** @var string */
    private $engineName;
    
    
     /**
     * Runs the collation engine on an array of witneses
     * 
     * The witnesses in the input array should be in the format expected by 
     * Collatex:
     * 
     *    $witness = [ 
     *                  'id' => 'WitnessID', 
     *                  'tokens' => [ 
     *                      ['t' => 'tokenText1', 'n' => 'normalization1', ...],
     *                      ['t' => 'tokenText2', 'n' => 'normalization2', ...],
     *                      ...
     *                  ]
     *               ]
     * @param array $witnessArray
     * @return array
     */
    abstract public function collate(array $witnessArray) : array;

    public function __construct(string $engineName) {
        if ($engineName === '') {
            $engineName = self::DEFAULT_COLLATION_ENGINE;
        }
        $this->engineName = $engineName;
        $this->resetError();
        $this->resetChronometer();
    }
    
    public function reset() {
        $this->resetChronometer();
        $this->resetError();
    }
    
    public function resetChronometer() {
        $this->duration = 0;
    }
    
    public function resetError() {
        $this->errorCode = self::ERROR_NOERROR;
        $this->errorContext = '';
    }

    public function getRunDateTime() : float {
        return $this->startMicroTime;
    }
    
    public function getRunDateTimeString() : string {
        return strftime("%d %b %Y, %H:%M:%S %Z", $this->getRunDateTime());
    }
    
    public function getDuration() : float {
        return $this->duration;
    }

    public function getErrorCode() : int {
        return $this->errorCode;
    }

    public function getErrorContext() : string{
        return $this->errorContext;
    }
    
    public function getRunDetails() : array {
        return [ 
            'engineName' => $this->getName(),
            'errorCode' => $this->getErrorCode(),
            'errorContext' => $this->getErrorContext(),
            'runDateTime' => $this->getRunDateTimeString(),
            'duration' => $this->getDuration()
        ];
    }
    
    public function getName() : string {
        return $this->engineName;
    }
        
    
    //
    // PROTECTED 
    // 
    protected function startChrono() {
        $this->duration = 0;
        $this->startMicroTime = microtime(true);
    }
    
    protected function endChrono() {
        $this->endMicroTime = microtime(true);
        $this->duration = $this->endMicroTime - $this->startMicroTime;
    }
    
    protected function setError(int $code, string $context='') {
        $this->errorCode = $code;
        $this->errorContext = $context;
    }
    
    
}
