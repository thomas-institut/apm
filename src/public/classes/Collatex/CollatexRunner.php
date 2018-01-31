<?php

/*
 *  Copyright (C) 2018 Universität zu Köln
 *  
 *  This program is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU General Public License
 *  as published by the Free Software Foundation; either version 2
 *  of the License, or (at your option) any later version.
 *   
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *  
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 *  
 */

namespace AverroesProject\Collatex;

/**
 * Class that interfaces with the collatex executable in the server
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class CollatexRunner {
    
    /**
     *
     * @var string
     */
    private $collatexExecutable;
    private $tempFolder;
    private $javaExecutable;
    
    public $error;
    public $errorContext;
    public $rawOuput;
    public $runTime;
    
    const CR_NO_ERROR=0;
    const CR_COLLATEX_EXECUTABLE_NOT_FOUND=101;
    const CR_TEMP_FOLDER_NOT_FOUND=102;
    const CR_TEMP_FOLDER_NOT_WRITABLE=103;
    const CR_JAVA_EXECUTABLE_NOT_FOUND=104;
    
    const CR_CANNOT_CREATE_INPUT_TEMP_FILE = 201;
    const CR_CANNOT_OPEN_INPUT_TEMP_FILE = 202;
    const CR_COLLATEX_RETURNED_NO_OUTPUT = 203;
    const CR_COLLATEX_EXIT_VALUE_NON_ZERO = 204;
    
    const CR_COLLATEX_DID_NOT_RETURN_JSON = 301;
    
    
    
    
    public function __construct($collatexExecutable, $tempFolder='/tmp', $java = '/usr/bin/java') {
        $this->collatexExecutable = $collatexExecutable;
        $this->tempFolder = $tempFolder;
        $this->javaExecutable = $java;
    }
    
    private function reset() {
        $this->error = self::CR_NO_ERROR;
        $this->errorContext = '';
        $this->rawOuput = '';
        $this->runTime = 0;
    }
    
    public function runningEnvironmentOk() {
        $this->reset();
        
        if (!file_exists($this->collatexExecutable)){
            $this->error = self::CR_COLLATEX_EXECUTABLE_NOT_FOUND;
            return false;
        }
        
        if (!file_exists($this->tempFolder)) {
            $this->error = self::CR_TEMP_FOLDER_NOT_FOUND;
            return false;
        }
        if (!is_writable($this->tempFolder)) {
            $this->error = self::CR_TEMP_FOLDER_NOT_WRITABLE;
            return false;
        }
        
        if (!file_exists($this->javaExecutable)) {
            $this->error = self::CR_JAVA_EXECUTABLE_NOT_FOUND;
            return false;
        }
        
        return true;
    }
    
    private function getCommandLine($inputFileName) 
    {
        return $this->javaExecutable . ' -jar ' . $this->collatexExecutable . ' ' . $inputFileName . ' 2>&1';
    }
    
    public function rawRun(string $rawJsonInput) {
        
        $start = microtime();
        $this->reset();
        
        if (!$this->runningEnvironmentOk()) {
            return false;
        }
        
        $tmpInputFileName = tempnam($this->tempFolder, 'collatex-input-');
        if ($tmpInputFileName === false) {
            $this->error = self::CR_CANNOT_CREATE_INPUT_TEMP_FILE;
            return false;
        }
        $handle = fopen($tmpInputFileName, "w");
        if ($handle === false) {
            $this->error = self::CR_CANNOT_OPEN_INPUT_TEMP_FILE;
        }
        
        fwrite($handle, $rawJsonInput);
        
        $returnValue = false;
        $returnArray = [];
       
        exec($this->getCommandLine($tmpInputFileName), $returnArray, $returnValue);
        
        if ($returnValue !== 0) {
            $this->error = self::CR_COLLATEX_EXIT_VALUE_NON_ZERO;
            $this->errorContext = 'Error code: ' . $returnValue;
            return false;
        }
        
        if (count($returnArray) === 0) {
            $this->error = self::CR_COLLATEX_RETURNED_NO_OUTPUT;
            return false;
        }
        $output = $returnArray[0];
        
        for ($i = 1; $i < count($returnArray); $i++) {
            $output .= "\n" . $returnArray[$i];
        }
        
        unlink($tmpInputFileName);
        $end = microtime();
        $this->runTime = $end - $start;
        return $output;
    }
    
    
    public function run(array $witnessArray) {
        
        $this->reset();
        $input = json_encode([ 'witnesses' => $witnessArray]);
        
        $this->rawOutput =  $this->rawRun($input);
        
        $output = json_decode($this->rawOutput);
        if ($output === null) {
            $this->error = self::CR_COLLATEX_DID_NOT_RETURN_JSON;
            return false;
        }
        
        return $output;
        
    }
}
