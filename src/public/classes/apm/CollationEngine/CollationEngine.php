<?php

/*
 * Copyright (C) 2016-18 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
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
    
    /** @var float */
    private $runTime;
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

    public function __construct(string $engineName = 'Generic Collation Engine') {
        $this->engineName = $engineName;
        $this->resetError();
        $this->resetChronometer();
    }
    
    public function reset() {
        $this->resetChronometer();
        $this->resetError();
    }
    
    public function resetChronometer() {
        $this->runTime = 0;
    }
    
    public function resetError() {
        $this->errorCode = self::ERROR_NOERROR;
        $this->errorContext = '';
    }

    public function getRunTime() : float {
        return $this->runTime;
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
            'runTime' => $this->getRunTime()
        ];
    }
    
    public function getName() : string {
        return $this->engineName;
    }
        
    
    //
    // PROTECTED 
    // 
    protected function startChrono() {
        $this->runTime = 0;
        $this->startMicroTime = microtime(true);
    }
    
    protected function endChrono() {
        $this->endMicroTime = microtime(true);
        $this->runTime = $this->endMicroTime - $this->startMicroTime;
    }
    
    protected function setError(int $code, string $context='') {
        $this->errorCode = $code;
        $this->errorContext = $context;
    }
    
    
}
