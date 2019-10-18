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

namespace APM\Api;


use AverroesProjectToApm\ItemStream;
use AverroesProjectToApm\ItemStreamWitness;
use Exception;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

use AverroesProject\Profiler\ApmProfiler;

use APM\Core\Witness\StringWitness;
use APM\Core\Collation\CollationTable;
use APM\Experimental\EditionWitness;
use APM\Decorators\QuickCollationTableDecorator;
use AverroesProjectToApm\Decorators\TransitionalCollationTableDecorator;
use AverroesProjectToApm\ApUserDirectory;
use AverroesProject\Data\DataManager;

/**
 * API Controller class
 *
 */
class ApiCollation extends ApiController
{
    const ERROR_NO_WITNESSES = 2000;
    const ERROR_NOT_ENOUGH_WITNESSES = 2001;
    const ERROR_BAD_WITNESS = 2002;
    const ERROR_FAILED_COLLATION_ENGINE_PROCESSING = 2003;
    const ERROR_INVALID_LANGUAGE = 2004;
    
    public function quickCollation(Request $request, Response $response)
    {
        $apiCall = 'quickCollation';
        $profiler = new ApmProfiler($apiCall, $this->getDataManager());
        $inputData = $this->checkAndGetInputData($request, $response, $apiCall, ['witnesses']);
        if (!is_array($inputData)) {
            return $inputData;
        }
        
        $witnesses = $inputData['witnesses'];
        if (count($witnesses) < 2) {
            $this->logger->error("Quick Collation: not enough witnessess in data, got " . count($witnesses),
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => self::ERROR_NOT_ENOUGH_WITNESSES,
                      'data' => $inputData ]);
            return $this->responseWithJson($response, ['error' => self::ERROR_NOT_ENOUGH_WITNESSES], 409);
        }
        
        
        $collation = new CollationTable();
        
        // Check and get initial witness data
        foreach ($witnesses as $witness) {
            if (!isset($witness['id']) || !isset($witness['text'])) {
                $this->logger->error("Quick Collation: bad witness in data",
                    [ 'apiUserId' => $this->apiUserId,
                      'apiError' => self::ERROR_BAD_WITNESS,
                      'data' => $inputData ]);
                return $this->responseWithJson($response, ['error' => self::ERROR_BAD_WITNESS], 409);
            }
            $sw =  new StringWitness('QuickCollation', 'no-chunk', $witness['text']);
            $collation->addWitness($witness['id'], $sw);
        }
        
        $collatexInput = $collation->getCollationEngineInput();
        
        $collationEngine = $this->getCollationEngine();
        
        // Run Collatex
        $collatexOutput = $collationEngine->collate($collatexInput);
        // @codeCoverageIgnoreStart
        // Not worrying about testing CollatexErrors here
        if ($collatexOutput === false) {
            $this->logger->error("Quick Collation: error running Collatex",
                        [ 'apiUserId' => $this->apiUserId,
                        'apiError' => ApiController::API_ERROR_COLLATION_ENGINE_ERROR,
                        'data' => $inputData, 
                        'collationEngineDetails' => $collationEngine->getRunDetails()
                    ]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_COLLATION_ENGINE_ERROR], 409);
        }
        // @codeCoverageIgnoreEnd
        
        try {
            $collation->setCollationTableFromCollationEngineOutput($collatexOutput);
        }
        // @codeCoverageIgnoreStart
        // Can't replicate this consistently in testing
        catch(Exception $ex) {
            $this->logger->error('Error processing collatexOutput into collation object', 
                    [ 'apiUserId' => $this->apiUserId,
                        'apiError' => self::ERROR_FAILED_COLLATION_ENGINE_PROCESSING,
                        'data' => $inputData, 
                         'collationEngineDetails' => $collationEngine->getRunDetails(),
                        'exceptionMessage' => $ex->getMessage()
                        ]);
            return $this->responseWithJson($response, ['error' => self::ERROR_FAILED_COLLATION_ENGINE_PROCESSING], 409);
        }
        // @codeCoverageIgnoreEnd
        
        $decoratedCollationTable = (new QuickCollationTableDecorator())->decorate($collation);

        $profiler->log($this->logger);
        
        return $this->responseWithJson($response,[
            'collationEngineDetails' => $collationEngine->getRunDetails(), 
            'collationTable' => $decoratedCollationTable,
            'sigla' => $collation->getSigla()
            ]);
        
    }
    
    
    /**
     * Generates an automatic collation table from a POST request
     * 
     * the POST request must contain a 'data' field with the following
     * subfields:
     *  work :  work code (e.g., 'AW47')
     *  chunk:  chunk number
     *  lang:  language code, e.g., 'la', 'he'
     *  requestedWitnesses:  array of witness identifications, each element of
     *      the array must be of the form: 
     *          [ 'type' => <TYPE> , 'id' => <ID> ]
     *      where 
     *          <TYPE> is a valid witness type
     *          <ID> is the witness system id (normally relative to its type)
     *               e.g, a system document id.
     *      If the witnesses array is empty, all valid witnesses for the
     *      given work, chunk and language will be collated.
     * 
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function automaticCollation(Request $request, Response $response)
    {
        $dataManager = $this->getDataManager();
        $apiCall = 'Collation';
        $requiredFields = [ 'work', 'chunk', 'lang', 'witnesses'];
        
        $inputDataObject = $this->checkAndGetInputData($request, $response, $apiCall, $requiredFields);
        if (!is_array($inputDataObject)) {
            return $inputDataObject;
        }
        
        $workId = $inputDataObject['work'];
        $chunkNumber = intval($inputDataObject['chunk']);
        $language = $inputDataObject['lang'];
        $requestedWitnesses = $inputDataObject['witnesses'];
        $ignorePunctuation = isset($inputDataObject['ignorePunctuation']) ?
                $inputDataObject['ignorePunctuation'] : false;
        
        $profiler = new ApmProfiler("CollationTable-$workId-$chunkNumber-$language", $dataManager);
        
        // Check that language is valid
        $languages = $this->languages;
        $langInfo = null;
        foreach($languages as $lang) {
            if ($lang['code'] === $language) {
                $langInfo = $lang;
            }
        }
        
        if (is_null($langInfo)) {
            $msg = 'Invalid language <b>' . $language . '</b>';
            $this->logger->error($msg);
            return $this->responseWithJson($response, ['error' => self::ERROR_INVALID_LANGUAGE, 'msg' => $msg], 409);
        }

        //$workInfo = $dataManager->getWorkInfo($workId);

        $validWitnessLocations = $dataManager->getValidWitnessLocationsForWorkChunkLang($workId, $chunkNumber, $language);
        if (count($validWitnessLocations) < 2) {
            $msg = 'Not enough valid witnesses to collate';
            $this->logger->error($msg, $validWitnessLocations);
            return $this->responseWithJson($response, ['error' => self::ERROR_NOT_ENOUGH_WITNESSES, 'msg' => $msg], 409);
        }
        
        $witnessesToInclude = [];
        $partialCollation = false;
        
        if (count($requestedWitnesses) !== 0) {
            foreach ($requestedWitnesses as $witness) {
                $witnessId = isset($witness['id']) ? intVal($witness['id']) : 0;
                if ($witnessId !== 0) {
                    foreach($validWitnessLocations as $witnessLocationInfo) {
                        if ($witnessLocationInfo['id'] == $witnessId) {
                            $witnessesToInclude[$witnessId] = $witnessLocationInfo;
                        }
                    }
                }
            }
            $partialCollation = true;
            if (count($witnessesToInclude) < 2) {
                $msg = 'Error in partial collation table request: need at least 2 witnesses to collate, got only ' . count($witnessesToInclude) . '.';
                $this->logger->error($msg, $witnessesToInclude);
                return $this->responseWithJson($response, ['error' => self::ERROR_NOT_ENOUGH_WITNESSES, 'msg' => $msg], 409);
            }
        }
        
        if (!$partialCollation) {
            $witnessesToInclude = $validWitnessLocations;
        }
        
        $profiler->lap('Checks done');
        
        $collationTable = new CollationTable($ignorePunctuation);
        $itemIds = [];
        $lastChangeInData = '0000-00-00 00:00:00.000000';
        $this->debug('Witnesses to include', $witnessesToInclude);
        foreach ($witnessesToInclude as $id => $witnessLocInfo)  {
            $witnessType = $witnessLocInfo['type'];
            $witnessLocation = $witnessLocInfo['locations'];
            $witnessId = $witnessLocInfo['id'];

            switch($witnessType) {
                case DataManager::WITNESS_TRANSCRIPTION:
                    // Get the AverroesProject item streams
                    $segmentStreams = [];
                    foreach($witnessLocation as $segLocation) {
                        if ($segLocation['lastTime'] > $lastChangeInData) {
                            $lastChangeInData = $segLocation['lastTime'];
                        }
                        $apItemStream = $dataManager->getItemStreamBetweenLocations($witnessId, $segLocation['start'], $segLocation['end']);
                        foreach($apItemStream as $row) {
                            $itemIds[] = (int) $row['id'];
                        }
                        $segmentStreams[] = $apItemStream;
                    }
                    $edNoteArrayFromDb = $dataManager->edNoteManager->rawGetEditorialNotesForListOfItems($itemIds);
                    $itemStream = new ItemStream($witnessId, $segmentStreams, $language, $edNoteArrayFromDb);
                    $itemStrWitness = new ItemStreamWitness($workId, $chunkNumber, $itemStream);
                    $docData = $dataManager->getDocById($witnessId);
                    $this->debug('docData', [$id, $docData]);
                    $collationTable->addWitness($docData['title'], $itemStrWitness);
                    break;

                case DataManager::WITNESS_PLAINTEXT:
                    // TODO: support plain text witnesses
                    break;
            }
        }
        
        $profiler->lap('Collation table built');
        $collatexInput = $collationTable->getCollationEngineInput();
        
        $profiler->lap('Collatex input built');
        $collationEngine = $this->getCollationEngine();
        
        // Run Collatex
        $collatexOutput = $collationEngine->collate($collatexInput);
        // @codeCoverageIgnoreStart
        // Not worrying about testing CollatexErrors here
        if ($collatexOutput === false) {
            $msg = "Automatic Collation: error running Collation Engine";
            $this->logger->error($msg,
                        [ 'apiUserId' => $this->apiUserId,
                        'apiError' => ApiController::API_ERROR_COLLATION_ENGINE_ERROR,
                        'data' => $collatexInput, 
                        'collationEngineDetails' => $collationEngine->getRunDetails()
                    ]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_COLLATION_ENGINE_ERROR, 'msg' => $msg], 409);
        }
        // @codeCoverageIgnoreEnd
        
        $profiler->lap('Collatex done');
        try {
            $collationTable->setCollationTableFromCollationEngineOutput($collatexOutput);
        }
        // @codeCoverageIgnoreStart
        // Can't replicate this consistently in testing
        catch(Exception $ex) {
            $msg = 'Error processing collation Engine output into collation object';
            $this->logger->error($msg, 
                    [ 'apiUserId' => $this->apiUserId,
                        'apiError' => self::ERROR_FAILED_COLLATION_ENGINE_PROCESSING,
                        'data' => $inputDataObject, 
                         'collationEngineDetails' => $collationEngine->getRunDetails(),
                        'exceptionMessage' => $ex->getMessage()
                        ]);
            return $this->responseWithJson($response, ['error' => self::ERROR_FAILED_COLLATION_ENGINE_PROCESSING], 409);
        }
        // @codeCoverageIgnoreEnd
        
        $profiler->lap('Collation table built from collatex output');
        $userDirectory = new ApUserDirectory($dataManager->userManager);
        $decorator = new TransitionalCollationTableDecorator($userDirectory);
        $decoratedCollationTable = $decorator->decorate($collationTable);
        
        $profiler->lap('Collation table decorated');
        
        // EXPERIMENTAL quick edition
        
        $qdw = new EditionWitness($collationTable, $collationTable->getSigla()[0], $language);
        
        $quickEdition = $qdw->generateEdition();
        

        $profiler->log($this->logger);
        
        $collationEngineDetails = $collationEngine->getRunDetails();
        $collationEngineDetails['totalDuration'] =  $profiler->getTotalTime() / 1000;
        
        return $this->responseWithJson($response,[
            'collationEngineDetails' => $collationEngineDetails, 
            'collationTable' => $decoratedCollationTable,
            'sigla' => $collationTable->getSigla(),
            'witnessInfo' => $witnessesToInclude,
            'lastChangeInData' => $lastChangeInData,
            'quickEdition' => $quickEdition
            ]);
    }

}
