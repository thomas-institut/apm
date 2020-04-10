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


use APM\CollationTable\CollationTableVersionInfo;
use APM\Engine\Engine;
use APM\FullTranscription\ApmTranscriptionWitness;
use APM\StandardData\CollationTableDataProvider;
use APM\System\Decorators\ApmCollationTableDecorator;
use APM\System\WitnessInfo;
use APM\System\WitnessSystemId;
use APM\System\WitnessType;
use AverroesProject\Data\UserManagerUserInfoProvider;
use Exception;
use InvalidArgumentException;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use APM\Core\Witness\StringWitness;
use APM\Core\Collation\CollationTable;
use APM\Experimental\EditionWitness;
use APM\Decorators\QuickCollationTableDecorator;
use ThomasInstitut\DataCache\KeyNotInCacheException;


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
    const ERROR_INVALID_COLLATION_TABLE_ID = 2005;
    const ERROR_COLLATION_TABLE_DOES_NOT_EXIST = 2006;

    
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
        $witnessIds = [];
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
                    $witnessIds[] = $this->systemManager->getFullTxWitnessId($fullTxWitness);

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

        
        $this->profiler->lap('Collation table built');

        $collationTableCacheId = implode(':', $witnessIds);
        $this->codeDebug('Collation table ID: ' . $collationTableCacheId);

        $cacheKey = 'ApiCollation-ACT-' . $workId . '-' . $chunkNumber . '-' . $language . '-' . hash('sha256', $collationTableCacheId);
        $this->codeDebug("Cache key: $cacheKey");

        $cache = $this->systemManager->getSystemDataCache();
        $cacheHit = true;
        try {
            $cachedData = $cache->get($cacheKey);
        } catch ( KeyNotInCacheException $e) {
            $this->systemManager->getCacheTracker()->incrementMisses();
            $cacheHit = false;
        }

        if ($cacheHit) {
            $this->systemManager->getCacheTracker()->incrementHits();
            $this->profiler->lap('Before decoding from cache');
            $responseData = json_decode(gzuncompress($cachedData), true);
            //$responseData = json_decode($cachedData, true);
            $this->profiler->lap("Data decoded from cache");
            if (!is_null($responseData)) {
                if (!isset($responseData['collationTableCacheId'])) {
                    // this will generate a cache key collision
                    $responseData['collationTableCacheId'] = 'collationTableCacheId not set';
                }
                if ($responseData['collationTableCacheId'] !== $collationTableCacheId) {
                    // this should almost never happen once the cached is cleared of entries without collationTableId
                    $this->logger->info("Cache key collision!", [
                        'cacheKey' => $cacheKey,
                        'requestedCollationTableCacheId' => $collationTableCacheId,
                        'cachedCollationTableCacheId' => $responseData['collationTableCacheId']
                    ]);
                } else {
                    $responseData['collationEngineDetails']['cached'] = true;
                    $this->profiler->stop();
                    $responseData['collationEngineDetails']['cachedRunTime'] = $this->getProfilerTotalTime();
                    $responseData['collationEngineDetails']['cachedTimestamp'] = time();
                    $this->logProfilerData("CollationTable-$workId-$chunkNumber-$language (cached)");
                    return $this->responseWithJson($response, $responseData);
                }
            }
        }
        // cache miss, or mismatch in cache keys, or bad cache data

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

        $ctStandardDataProvider = new CollationTableDataProvider($collationTable);
        $standardData = $ctStandardDataProvider->getStandardData();
        $userIds = $ctStandardDataProvider->getUserIdsFromData($standardData);
        $people = [];
        foreach($userIds as $userId) {
            $people[$userId] = [
                'fullName' => $userDirectory->getFullNameFromId($userId),
                'shortName' => $userDirectory->getShortNameFromId($userId)
                ];
        }

        
        // EXPERIMENTAL quick edition ===> done via API call

        $this->profiler->stop();
        $this->logProfilerData("CollationTable-$workId-$chunkNumber-$language");

        $collationEngineDetails = $collationEngine->getRunDetails();
        $collationEngineDetails['cached'] = false;

        $collationEngineDetails['totalDuration'] =  $this->getProfilerTotalTime();

        $responseData = [
            'type' => 'auto',
            'collationTableCacheId' => $collationTableCacheId,
            'collationEngineDetails' => $collationEngineDetails,
            'collationTable' => $standardData,
            'people' => $people,
        ];

        // let's cache it!
        $this->profiler->start();
        $jsonToCache = json_encode($responseData, JSON_UNESCAPED_UNICODE);
        // gzip it, just for fun
        $zipped = gzcompress($jsonToCache);
        $this->logger->debug("Caching automatic collation, JSON size = " . strlen($jsonToCache) . " bytes; gzipped : " . strlen($zipped));
        $cache->set($cacheKey,$zipped);

        $this->profiler->stop();

        $this->logProfilerData("CollationTable-$workId-$chunkNumber-$language, encoding and storing in cache");

        return $this->responseWithJsonRaw($response, $jsonToCache);
    }

    public function saveCollationTable(Request $request, Response $response) {

        $apiCall = 'CollationSave';
        $requiredFields = [ 'collationTable'];

        $this->profiler->start();

        $inputDataObject = $this->checkAndGetInputData($request, $response, $apiCall, $requiredFields);
        if (!is_array($inputDataObject)) {
            return $inputDataObject;
        }
        $this->logger->debug("Save Collation api call");

        $ctManager = $this->systemManager->getCollationTableManager();

        $versionInfo = new CollationTableVersionInfo();
        $versionInfo->authorId = $this->apiUserId;
        $versionInfo->description = isset($inputDataObject['descr']) ? $inputDataObject['descr'] : '';
        $versionInfo->isMinor = isset($inputDataObject['isMinor']) ? $inputDataObject['isMinor'] : false;
        $versionInfo->isReview = isset($inputDataObject['isReview']) ? $inputDataObject['isReview'] : false;

        $collationTableData = $inputDataObject['collationTable'];
        $collationTableId = -1;
        if (isset($inputDataObject['collationTableId'])) {
            // save a new version
            $collationTableId = intval($inputDataObject['collationTableId']);
            $this->codeDebug("Saving collation table $collationTableId");
            if ($collationTableId <= 0) {
                $msg = 'Invalid collation table ID ' . $collationTableId;
                $this->logger->error($msg,
                    [ 'apiUserId' => $this->apiUserId,
                        'apiError' => self::ERROR_INVALID_COLLATION_TABLE_ID,
                        'data' => $inputDataObject,
                    ]);
                return $this->responseWithJson($response, ['error' => self::ERROR_INVALID_COLLATION_TABLE_ID], 409);
            }
            // check that the ct exists
            $versions = $ctManager->getCollationTableVersions($collationTableId);
            if (count($versions) === 0) {
                // table Id does not exist!
                $msg = "Collation table ID $collationTableId does not exist";
                $this->logger->error($msg,
                    [ 'apiUserId' => $this->apiUserId,
                        'apiError' => self::ERROR_COLLATION_TABLE_DOES_NOT_EXIST,
                        'data' => $inputDataObject,
                    ]);
                return $this->responseWithJson($response, ['error' => self::ERROR_COLLATION_TABLE_DOES_NOT_EXIST], 409);
            }
            // save
            $ctManager->saveCollationTable($collationTableId, $collationTableData, $versionInfo);
            $responseData = [
                'status' => 'OK',
                'tableId' => $collationTableId,
                'versionInfo' => $ctManager->getCollationTableVersions($collationTableId)
            ];

            $this->profiler->stop();
            $this->logProfilerData('Api.SaveCollationTable');
            return $this->responseWithJson($response, $responseData);
        }

        // new collation table
        $this->codeDebug("Saving new collation table");
        $collationTableId = $ctManager->saveNewCollationTable($collationTableData, $versionInfo);
        $responseData = [
            'status' => 'OK',
            'tableId' => $collationTableId,
            'versionInfo' => $ctManager->getCollationTableVersions($collationTableId)
        ];

        $this->profiler->stop();
        $this->logProfilerData('Api.SaveCollationTable (new table');
        return $this->responseWithJson($response, $responseData);
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
