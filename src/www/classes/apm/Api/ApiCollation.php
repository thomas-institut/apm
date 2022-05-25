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
use APM\Core\Witness\EditionWitness;
use APM\Engine\Engine;
use APM\StandardData\CollationTableDataProvider;
use APM\System\WitnessInfo;
use APM\System\WitnessSystemId;
use APM\System\WitnessType;
use APM\ToolBox\SiglumGenerator;
use AverroesProject\Data\UserManagerUserInfoProvider;
use Exception;
use InvalidArgumentException;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use APM\Core\Witness\StringWitness;
use APM\Core\Collation\CollationTable;
use APM\Decorators\QuickCollationTableDecorator;
use ThomasInstitut\DataCache\KeyNotInCacheException;
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
    const ERROR_INVALID_COLLATION_TABLE_ID = 2005;
    const ERROR_COLLATION_TABLE_DOES_NOT_EXIST = 2006;
    const ERROR_MISSING_VERSION_INFO = 2007;


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
    public function automaticCollation(Request $request, Response $response): Response
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

        // Checking normalizers
        $normalizerManager = $this->systemManager->getNormalizerManager();
        $normalizerNames = [];
        $normalizers = [];
        if (isset($inputDataObject['normalizers'])) {
            foreach($inputDataObject['normalizers'] as $normalizerName) {
                try {
                    $normalizer = $normalizerManager->getNormalizerByName($normalizerName);
                } catch(InvalidArgumentException $e) {
                    $this->codeDebug("Unknown normalizer name found: $normalizerName");
                }
                $normalizers[] = $normalizer;
                $normalizerNames[] = $normalizerName;
            }
        } else {
            $normalizerNames = $normalizerManager->getNormalizerNamesByLangAndCategory($language, 'standard');
            $normalizers = $normalizerManager->getNormalizersByLangAndCategory($language, 'standard');
        }

        $this->profiler->lap('Basic checks done');

        $collationTable = new CollationTable($ignorePunctuation, $language, $normalizers);
        $collationTable->setLogger($this->logger);
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
//        $this->codeDebug('Collation table built', $collationTable->getData());

        $collationTableCacheId = implode(':', $witnessIds) . '-' . implode(':', $normalizerNames);
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

        // generate witness titles and default sigla
        $sigla = [];
        $titles = [];
        $witnessOrder = [];
        foreach($standardData->witnesses as $i => $witness) {
            $sigla[$i] = SiglumGenerator::generateSiglaByIndex($i);
            $titles[$i] = $standardData->sigla[$i];
            $witnessOrder[$i] = $i;
        }
        $standardData->sigla = $sigla;
        $standardData->witnessTitles = $titles;
        $standardData->witnessOrder = $witnessOrder;

        // add normalizerNames
        $standardData->automaticNormalizationsApplied = $normalizerNames;

        // add chunkId
        $standardData->chunkId = $standardData->witnesses[0]->chunkId;


        $userIds = $ctStandardDataProvider->getUserIdsFromData($standardData);
        $people = [];
        foreach($userIds as $userId) {
            $people[$userId] = [
                'fullName' => $userDirectory->getNormalizedName($userId),
                'shortName' => $userDirectory->getShortName($userId)
                ];
        }

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
            'automaticNormalizationsApplied' => $normalizerNames,
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
        $this->info("Automatic Collation Table generated", ['workId'=>$workId, 'chunk' => $chunkNumber, 'lang' => $lang]);

        $this->logProfilerData("CollationTable-$workId-$chunkNumber-$language, encoding and storing in cache");

        return $this->responseWithJsonRaw($response, $jsonToCache);
    }

    public function saveCollationTable(Request $request, Response $response): Response
    {

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
        $versionInfo->description = $inputDataObject['descr'] ?? '';
        $versionInfo->isMinor = $inputDataObject['isMinor'] ?? false;
        $versionInfo->isReview = $inputDataObject['isReview'] ?? false;

        $collationTableData = $inputDataObject['collationTable'];
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

            $versionInfo->collationTableId = $collationTableId;

            // save
            try {
                $ctManager->saveCollationTable($collationTableId, $collationTableData, $versionInfo);
            } catch (Exception $e) {
                // Error saving table
                $errorCode = $e->getCode();
                $msg = "Server runtime error saving edition/collation table $collationTableId (error code $errorCode)";
                $this->logger->error($msg, [ 'exceptionError' => $e->getCode(), 'exceptionMsg' => $e->getMessage(), 'tableId' => $collationTableId]);
                return $this->responseWithJson($response, ['error' => self::API_ERROR_RUNTIME_ERROR, 'msg' => $msg], 409);
            }
            $responseData = [
                'status' => 'OK',
                'tableId' => $collationTableId,
                'versionInfo' => $ctManager->getCollationTableVersions($collationTableId)
            ];

            $this->profiler->stop();
            $this->info("Collation Table $collationTableId saved");
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
        $this->info("Collation Table $collationTableId saved (new table)");
        $this->logProfilerData('Api.SaveCollationTable (new table');
        return $this->responseWithJson($response, $responseData);
    }

    public function convertWitnessToEdition(Request $request, Response $response): Response
    {
        $apiCall = 'WitnessToEdition';


        $this->profiler->start();
        $witnessId = $request->getAttribute('witnessId');
        $witnessInfo = WitnessSystemId::getFullTxInfo($witnessId);
        $this->codeDebug("Witness to Edition api call: $witnessId", get_object_vars($witnessInfo));
        $transcriptionManager = $this->systemManager->getTranscriptionManager();

        try {
            $fullTxWitness = $transcriptionManager->getTranscriptionWitness($witnessInfo->workId,
                $witnessInfo->chunkNumber, $witnessInfo->typeSpecificInfo['docId'],
                $witnessInfo->typeSpecificInfo['localWitnessId'], $witnessInfo->typeSpecificInfo['timeStamp']);
        } catch (InvalidArgumentException $e) {
            // cannot get witness
            $msg = "Requested witness '" . $witnessId . "' does not exist";
            $this->logger->error($msg, [ 'exceptionError' => $e->getCode(), 'exceptionMsg' => $e->getMessage(), 'witness'=> $witnessId]);
            return $this->responseWithJson($response, ['error' => self::ERROR_BAD_WITNESS, 'msg' => $msg], 409);
        }

        $language = $fullTxWitness->getLang();
        $docId = $fullTxWitness->getDocId();
        $work = $fullTxWitness->getWorkId();
        $docInfo = $this->getDataManager()->getDocById($docId);
        $witnessTitle = $docInfo['title'];

        $normalizerManager = $this->systemManager->getNormalizerManager();
        $normalizerNames = $normalizerManager->getNormalizerNamesByLangAndCategory($language, 'standard');
        $normalizers = $normalizerManager->getNormalizersByLangAndCategory($language, 'standard');

        // notice that we do not ignore punctuation
        $collationTable = new CollationTable(false, $language, $normalizers);
        $collationTable->setLogger($this->logger);

        $fullTxWitnessSiglum = 'A';
        $editionWitnessSiglum = '_edition_';
        $collationTable->addWitness($fullTxWitnessSiglum, $fullTxWitness, $witnessTitle, false);

        // save the collation table to get a table Id
        $standardData =(new CollationTableDataProvider($collationTable))->getStandardData();
        // add normalizer names to std data
        $standardData->automaticNormalizationsApplied = $normalizerNames;

        $ctManager = $this->systemManager->getCollationTableManager();

        $versionInfo = new CollationTableVersionInfo();
        $versionInfo->authorId = $this->apiUserId;
        $versionInfo->description = 'Table with single witness registered in the system';
        $versionInfo->isMinor = false;
        $versionInfo->isReview = false;

        $standardDataAsArray = json_decode(json_encode($standardData), true);

        $collationTableId = $ctManager->saveNewCollationTable($standardDataAsArray, $versionInfo);
        $this->codeDebug("Saved collation table, id = $collationTableId" );

        // Build the edition witness
        $editionWitness = new EditionWitness($fullTxWitness->getWorkId(), $fullTxWitness->getChunk());
        $editionToFullTxTokenMap = $editionWitness->setTokensFromNonEditionTokens($fullTxWitness->getTokens());
        $editionWitness->setLang($fullTxWitness->getLang());
        $collationTable->addWitness($editionWitnessSiglum, $editionWitness, 'Edition', true);

        // Align the tokens
        $fullTxWitnessReferenceArray = $collationTable->getReferencesForRow($fullTxWitnessSiglum);
        $editionWitnessReferenceArray = [];
        foreach($fullTxWitnessReferenceArray as $ref) {
            $indexInEditionWitness = array_search($ref, $editionToFullTxTokenMap);
            if ($indexInEditionWitness === false) {
                // but this should never happen!
                $indexInEditionWitness = -1;
            }
            $editionWitnessReferenceArray[] = $indexInEditionWitness;
        }
        $collationTable->setReferencesForRow($editionWitnessSiglum, $editionWitnessReferenceArray);

        $collationTable->setTitle("Edition $witnessTitle");

        $standardData =(new CollationTableDataProvider($collationTable))->getStandardData();
        $standardData->automaticNormalizationsApplied = $normalizerNames;
        $standardData->witnesses[1]->ApmWitnessId = WitnessSystemId::buildEditionId($standardData->chunkId, $collationTableId, TimeString::now());
        $standardData->tableId = $collationTableId;


        // the edition is in position 0
        $standardData->witnessOrder = [ 1, 0];

        $versionInfo = new CollationTableVersionInfo();
        $versionInfo->authorId = $this->apiUserId;
        $versionInfo->collationTableId = $collationTableId;
        $versionInfo->description = 'Edition text added by the system to complete creation of edition with a single witness';
        $versionInfo->isMinor = false;
        $versionInfo->isReview = false;

        $standardDataAsArray = json_decode(json_encode($standardData), true);

        $ctManager->saveCollationTable($collationTableId, $standardDataAsArray, $versionInfo);

        $responseData = [
            'status' => 'OK',
            'witnessId' => $witnessId,
            'lang' => $language,
            'tableId' => $collationTableId
        ];

        $this->profiler->stop();
        $this->logProfilerData('Witness to Edition conversion');
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
            if ($witnessInfo->languageCode === $langCode) {
                $vWL[] = $witnessInfo;
            }
        }
        return $vWL;
    }
}