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

use APM\Engine\Engine;

/**
 * Class that interfaces with the collatex executable in the server
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 * @deprecated Use CollatexHttp
 */
class Collatex extends CollationEngine {
    
    /**
     *
     * @var string
     */
    protected string $collatexExecutable;
    protected string $tempFolder;
    protected string $javaExecutable;
    
    protected $rawOutput;
    protected $input;
    
    const CR_COLLATEX_EXECUTABLE_NOT_FOUND=101;
    const CR_TEMP_FOLDER_NOT_FOUND=102;
    const CR_TEMP_FOLDER_NOT_WRITABLE=103;
    const CR_JAVA_EXECUTABLE_NOT_FOUND=104;
    
    const CR_CANNOT_CREATE_INPUT_TEMP_FILE = 201;
    const CR_CANNOT_OPEN_INPUT_TEMP_FILE = 202;
    const CR_COLLATEX_RETURNED_NO_OUTPUT = 203;
    const CR_COLLATEX_EXIT_VALUE_NON_ZERO = 204;
    
    const CR_COLLATEX_DID_NOT_RETURN_JSON = 301;
    
    public function __construct(string $collatexExecutable, string $tempFolder='/tmp', string $java = '/usr/bin/java') {
        parent::__construct('Collatex 1.7.1');
        $this->collatexExecutable = $collatexExecutable;
        $this->tempFolder = $tempFolder;
        $this->javaExecutable = $java;
        $this->input = [];
        $this->reset();
    }
    
    public function reset(): void
    {
        parent::reset();
        $this->rawOutput = '';
    }
    
    public function runningEnvironmentOk(): bool
    {
        $this->reset();
        
        if (!file_exists($this->collatexExecutable)){
            $this->setError(self::CR_COLLATEX_EXECUTABLE_NOT_FOUND, 'Executable not found');
            return false;
        }
        
        if (!file_exists($this->tempFolder)) {
            $this->setError(self::CR_TEMP_FOLDER_NOT_FOUND, 'Temp folder not found');
            return false;
        }
        if (!is_writable($this->tempFolder)) {
            $this->setError(self::CR_TEMP_FOLDER_NOT_WRITABLE, 'Temp folder not writable');
            return false;
        }
        
        if (!file_exists($this->javaExecutable)) {
            $this->setError(self::CR_JAVA_EXECUTABLE_NOT_FOUND, 'Java executable not found');
            return false;
        }
        
        return true;
    }
    
    private function getCommandLine($inputFileName): string
    {
        return $this->javaExecutable . ' -jar ' . $this->collatexExecutable . ' ' . $inputFileName . ' 2>&1';
    }
    
    public function rawRun(string $rawJsonInput) {
        
        $this->startChrono();
        $this->reset();
        
        if (!$this->runningEnvironmentOk()) {
            return false;
        }
        
        $tmpInputFileName = tempnam($this->tempFolder, 'collatex-input-');
        if ($tmpInputFileName === false) {
            // Cannot reproduce this condition in testing
            // @codeCoverageIgnoreStart
            $this->setError(self::CR_CANNOT_CREATE_INPUT_TEMP_FILE);
            return false;
            // @codeCoverageIgnoreEnd
        }
        $handle = fopen($tmpInputFileName, "w");
        if ($handle === false) {
            // Cannot reproduce this condition in testing
            // @codeCoverageIgnoreStart
            $this->setError(self::CR_CANNOT_OPEN_INPUT_TEMP_FILE);  
            return false;
            // @codeCoverageIgnoreEnd
        }
        
        fwrite($handle, $rawJsonInput);
        
        $returnValue = 0;
        $returnArray = [];
       
        exec($this->getCommandLine($tmpInputFileName), $returnArray, $returnValue);
        
        if ($returnValue !== 0) {
            $this->setError(self::CR_COLLATEX_EXIT_VALUE_NON_ZERO, 'Error code: ' . $returnValue);
            return false;
        }
        
        if (count($returnArray) === 0) {
            // Cannot reproduce this condition in testing
            // @codeCoverageIgnoreStart
            $this->setError(self::CR_COLLATEX_RETURNED_NO_OUTPUT);
            return false;
            // @codeCoverageIgnoreEnd
        }
        $output = $returnArray[0];
        
        for ($i = 1; $i < count($returnArray); $i++) {
            $output .= "\n" . $returnArray[$i];
        }
        
//        unlink($tmpInputFileName);
        $this->endChrono();
        return $output;
    }
    
    /**
     * Runs Collatex on an array of witnesses
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
    public function collate(array $witnessArray) : array {
        
        $this->reset();
        $input = json_encode([ 'witnesses' => $witnessArray]);
        
        $this->input = $witnessArray;
        $this->rawOutput =  $this->rawRun($input);
        
        if ($this->getErrorCode() !== Engine::ERROR_NO_ERROR) {
            return [];
        }
        
        $output = json_decode($this->rawOutput, true);
        if ($output === null) {
            $this->setError(self::CR_COLLATEX_DID_NOT_RETURN_JSON);
            return [];
        }
        return $output;
        
    }
    
    public function getRawOutput() {
        return json_decode($this->rawOutput, true);
    }
    
    public function getRunDetails() : array {
        $details = parent::getRunDetails();
        $details['rawOutput'] = $this->rawOutput;
        $details['collatexOutput'] = $this->getRawOutput();
        $details['collatexInput'] = $this->input;
        return $details;
    }

}
