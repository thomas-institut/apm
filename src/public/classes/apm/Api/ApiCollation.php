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


use APM\Engine\Engine;
use APM\FullTranscription\ApmTranscriptionWitness;
use APM\System\Decorators\ApmCollationTableDecorator;
use APM\System\WitnessInfo;
use APM\System\WitnessSystemId;
use APM\System\WitnessType;
use AverroesProject\Data\UserManagerUserInfoProvider;
use AverroesProjectToApm\DatabaseItemStream;
use AverroesProjectToApm\DatabaseItemStreamWitness;
use DI\DependencyException;
use DI\NotFoundException;
use Exception;
use InvalidArgumentException;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

use APM\Core\Witness\StringWitness;
use APM\Core\Collation\CollationTable;
use APM\Experimental\EditionWitness;
use APM\Decorators\QuickCollationTableDecorator;
use AverroesProjectToApm\Decorators\TransitionalCollationTableDecorator;
use AverroesProjectToApm\ApUserDirectory;
use AverroesProject\Data\DataManager;
use ThomasInstitut\TimeString\TimeString;

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
        $this->profiler->start();
        $inputData = $this->checkAndGetInputData($request, $response, $apiCall, ['witnesses']);
        $this->debug('Input data', [ $inputData ]);
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
                $this->profiler->stop();
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
        if ($collatexOutput === [] && $collationEngine->getErrorCode() !==  Engine::ERROR_NOERROR) {

            $this->logger->error("Quick Collation: error running Collatex",
                        [ 'apiUserId' => $this->apiUserId,
                        'apiError' => ApiController::API_ERROR_COLLATION_ENGINE_ERROR,
                        'collatexError' => $collationEngine->getErrorCode(),
                        'collationEngineDetails' => $collationEngine->getRunDetails(),
                        'data' => $inputData
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

        $this->profiler->stop();
        $this->logProfilerData('quickCollation');
        
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
     *          [ 'type' => <TYPE> , 'id' => <ID ARRAY>
     *      where
     *          <TYPE> is a valid witness type
     *          <ID ARRAY> is the witness system id (normally relative to its type)
     *                for full transcriptions it is an array with 1 to 3 elements containing
     *                the document Id, an optional local witness Id (defaults to 'A') and an
     *                optional timeStamp (defaults to TimeString::now())
     *
     *      If the witnesses array is empty, all valid witnesses for the
     *      given work, chunk and language will be collated.
     *
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws DependencyException
     * @throws NotFoundException
     */
    public function automaticCollation(Request $request, Response $response)
    {
        //$this->codeDebug('Starting automaticCollation');
        $dataManager = $this->getDataManager();
        $transcriptionManager = $this->systemManager->getTranscriptionManager();
        $apiCall = 'Collation';
        $requiredFields = [ 'work', 'chunk', 'lang', 'witnesses'];

        $inputDataObject = $this->checkAndGetInputData($request, $response, $apiCall, $requiredFields);
        if (!is_array($inputDataObject)) {
            return $inputDataObject;
        }
        //$this->codeDebug('inputDataObject', $inputDataObject);
        
        $workId = $inputDataObject['work'];
        $chunkNumber = intval($inputDataObject['chunk']);
        $language = $inputDataObject['lang'];
        $requestedWitnesses = $inputDataObject['witnesses'];
        //$this->codeDebug('Requested witnesses', $requestedWitnesses);
        $ignorePunctuation = isset($inputDataObject['ignorePunctuation']) ?
                $inputDataObject['ignorePunctuation'] : false;

        $this->profiler->start();

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

        if (count($requestedWitnesses) < 2) {
            $msg = 'Not enough requested witnesses to collate';
            $this->logger->error($msg, $requestedWitnesses);
            return $this->responseWithJson($response, ['error' => self::ERROR_NOT_ENOUGH_WITNESSES, 'msg' => $msg], 409);
        }

        $this->profiler->lap('Basic checks done');

        $collationTable = new CollationTable($ignorePunctuation, $language);
        foreach($requestedWitnesses as $requestedWitness) {
            if (!isset($requestedWitness['type'])) {
                $msg = "Missing required parameter 'type' in requested witness";
                $this->logger->error($msg);
                return $this->responseWithJson($response, ['error' => self::API_ERROR_MISSING_REQUIRED_FIELD, 'msg' => $msg], 409);
            }
            switch ($requestedWitness['type']) {
                case WitnessType::FULL_TRANSCRIPTION:
                    if (!isset($requestedWitness['systemId'])) {
                        $msg = "Missing required parameter 'systemId' in requested witness";
                        $this->logger->error($msg);
                        return $this->responseWithJson($response, ['error' => self::API_ERROR_MISSING_REQUIRED_FIELD, 'msg' => $msg], 409);
                    }
                    if (!isset($requestedWitness['title'])) {
                        $msg = "Missing required parameter 'title' in requested witness";
                        $this->logger->error($msg);
                        return $this->responseWithJson($response, ['error' => self::API_ERROR_MISSING_REQUIRED_FIELD, 'msg' => $msg], 409);
                    }
                    $witnessInfo = WitnessSystemId::getFullTxInfo($requestedWitness['systemId']);
                    //if ($witnessInfo->typeSpecificInfo['timeStamp'] === '') {
                        // Do nothing,  TranscriptionManager will take care of it
                        //$this->codeDebug('Timestamp is empty ');
                    //}
                    try {
                        $fullTxWitness = $transcriptionManager->getTranscriptionWitness($witnessInfo->workId,
                            $witnessInfo->chunkNumber, $witnessInfo->typeSpecificInfo['docId'],
                            $witnessInfo->typeSpecificInfo['localWitnessId'], $witnessInfo->typeSpecificInfo['timeStamp']);
                    } catch (InvalidArgumentException $e) {
                        // cannot get witness
                        $msg = "Requested witness '" . $requestedWitness['systemId'] . "' does not exist";
                        $this->logger->error($msg, [ 'exceptionError' => $e->getCode(), 'exceptionMsg' => $e->getMessage(), 'witness'=> $requestedWitness]);
                        return $this->responseWithJson($response, ['error' => self::ERROR_BAD_WITNESS, 'msg' => $msg], 409);
                    }

                    try {
                        $collationTable->addWitness($requestedWitness['title'], $fullTxWitness);
                    } catch (InvalidArgumentException $e) {
                        $this->logger->warning('Cannot add fullTx witness to collation table', [$witnessInfo]);
                    }

                    break;

                case WitnessType::PARTIAL_TRANSCRIPTION:
                    $this->logger->info('Partial Transcription Witness requested, not implemented yet', $requestedWitnesses);
                    break;

                default:
                    $this->logger->info("Unsupported witness type requested for collation", $requestedWitness);
            }
        }

        if (count($collationTable->getSigla()) < 2) {
            $msg = 'Need at least 2 witnesses to collate, got only ' . count($collationTable->getSigla()) . '.';
            $this->logger->error($msg, $collationTable->getSigla());
            return $this->responseWithJson($response, ['error' => self::ERROR_NOT_ENOUGH_WITNESSES, 'msg' => $msg], 409);
        }

        
        $this->profiler->lap('Collation table build');
        

        $itemIds = [];

        

        $collatexInput = $collationTable->getCollationEngineInput();
        
        $this->profiler->lap('Collation engine input built');
        $collationEngine = $this->getCollationEngine();
        
        // Run collation engine
        $collatexOutput = $collationEngine->collate($collatexInput);
        // @codeCoverageIgnoreStart
        // Not worrying about testing CollatexErrors here
        if ($collatexOutput === false) {
            $msg = "Automatic Collation: error running collation engine";
            $this->logger->error($msg,
                        [ 'apiUserId' => $this->apiUserId,
                        'apiError' => ApiController::API_ERROR_COLLATION_ENGINE_ERROR,
                        'data' => $collatexInput, 
                        'collationEngineDetails' => $collationEngine->getRunDetails()
                    ]);
            return $this->responseWithJson($response, ['error' => ApiController::API_ERROR_COLLATION_ENGINE_ERROR, 'msg' => $msg], 409);
        }
        // @codeCoverageIgnoreEnd
        //$this->codeDebug('CollationEngine output', $collatexOutput);
        
        $this->profiler->lap('Collation engine done');
        try {
            $collationTable->setCollationTableFromCollationEngineOutput($collatexOutput);
        }
        // @codeCoverageIgnoreStart
        // Can't replicate this consistently in testing
        catch(Exception $ex) {
            $msg = 'Error processing collation engine output into collation object';
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
        
        $this->profiler->lap('Collation table built from collation engine output');
        $userDirectory = new UserManagerUserInfoProvider($dataManager->userManager);
//        $decorator = new TransitionalCollationTableDecorator();
//        $decorator->setUserInfoProvider($userDirectory);
//        $decorator->setLogger($this->logger);
//        $decoratedCollationTable = $decorator->decorate($collationTable);

        $newDecorator = new ApmCollationTableDecorator();
        $newDecorator->setLogger($this->logger);
        $newDecorator->setUserInfoProvider($userDirectory);
        $decoratedCollationTableNew = $newDecorator->decorate($collationTable);
        
        $this->profiler->lap('Collation table decorated');
        
        // EXPERIMENTAL quick edition
        
        $qdw = new EditionWitness($collationTable, $collationTable->getSigla()[0], $language);
        
        $quickEdition = $qdw->generateEdition();

        $this->profiler->stop();
        $this->logProfilerData("CollationTable-$workId-$chunkNumber-$language");
        
        $collationEngineDetails = $collationEngine->getRunDetails();

        $collationEngineDetails['totalDuration'] =  $this->getProfilerTotalTime();
        
        return $this->responseWithJson($response,[
            'collationEngineDetails' => $collationEngineDetails, 
            //'collationTable' => $decoratedCollationTable,
            'newCollationTable' => $decoratedCollationTableNew,
            //'sigla' => $collationTable->getSigla(),
            'quickEdition' => $quickEdition
            ]);
    }


    /**
     * @param string $workId
     * @param int $chunkNumber
     * @param string $langCode
     * @return WitnessInfo[]
     */
    protected function getValidWitnessesForChunkLang(string $workId, int $chunkNumber, string $langCode) : array {
        $this->logger->debug("Getting valid witnesses for $workId, $chunkNumber, $langCode");
        $tm = $this->systemManager->getTranscriptionManager();

        $vw = $tm->getWitnessesForChunk($workId, $chunkNumber);

        $vWL = [];
        foreach($vw as $witnessInfo) {
            /** @var WitnessInfo $witnessInfo */
            if ($witnessInfo->languageCode === $langCode) {
                $vWL[] = $witnessInfo;
            }
        }
        return $vWL;
    }
}
