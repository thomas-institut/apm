<?php
/* 
 *  Copyright (C) 2020 Universität zu Köln
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

use APM\Core\Witness\SimpleHtmlWitnessDecorator;
use APM\Decorators\Witness\ApmTxWitnessDecorator;
use APM\EntitySystem\Exception\EntityDoesNotExistException;
use APM\StandardData\FullTxWitnessDataProvider;
use APM\System\Document\Exception\DocumentNotFoundException;
use APM\System\Transcription\ApmTranscriptionManager;
use APM\System\Transcription\ApmTranscriptionWitness;
use APM\System\WitnessSystemId;
use APM\System\WitnessType;
use APM\ToolBox\HttpStatus;
use AverroesProjectToApm\ApmPersonInfoProvider;
use AverroesProjectToApm\Formatter\WitnessPageFormatter;
use Exception;
use InvalidArgumentException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\TimeString\TimeString;


class ApiWitness extends ApiController
{

    const CLASS_NAME = 'Witnesses';

    const ERROR_WITNESS_TYPE_NOT_IMPLEMENTED = 1001;
    const ERROR_UNKNOWN_WITNESS_TYPE = 1002;
    const ERROR_SYSTEM_ID_ERROR = 1003;

    const WITNESS_DATA_CACHE_KEY_PREFIX = 'ApiWitness-WitnessData-';
    const WITNESS_HTML_CACHE_KEY_POSTFIX = '-html';

    const WITNESS_DATA_CACHE_TTL = 30 * 24 * 3600; // 30 days

    public function getWitness(Request $request, Response $response): Response
    {

        $witnessId = $request->getAttribute('witnessId');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ":" . $witnessId);
        $this->profiler->start();
        $outputType = $request->getAttribute('outputType', 'full');
        $useCache = $request->getAttribute('cache',  'usecache') === 'usecache';

        $witnessType = WitnessSystemId::getType($witnessId);

        switch ($witnessType) {
            case WitnessType::FULL_TRANSCRIPTION:
                return $this->getFullTxWitness($witnessId, $outputType, $response, $useCache);

            case WitnessType::PARTIAL_TRANSCRIPTION:
                $msg = 'Witness type ' . WitnessType::PARTIAL_TRANSCRIPTION . ' not implemented yet';
                $this->logger->error($msg, [
                    'apiUserTid' => $this->apiUserId,
                    'apiError' => self::ERROR_WITNESS_TYPE_NOT_IMPLEMENTED
                ]);
                return $this->responseWithJson($response, [ 'error' => $msg ], 409);

            default:
                $msg = "Unknown witness type $witnessType";
                $this->logger->error($msg, [
                    'apiUserTid' => $this->apiUserId,
                    'apiError' => self::ERROR_UNKNOWN_WITNESS_TYPE
                ]);
                return $this->responseWithJson($response, [ 'error' => $msg ], 409);
        }
    }

    public function checkWitnessUpdates(Request $request, Response $response): Response
    {
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__);
        $this->profiler->start();
        $inputData = $this->checkAndGetInputData($request, $response, ['witnesses']);
        //$this->debug('Input data', [ $inputData ]);
        if (!is_array($inputData)) {
            return $inputData;
        }

        $witnessArray = $inputData['witnesses'];
        if ($witnessArray === []) {
            $this->logger->warning("$this->apiCallName: no witnesses in request");
        }
        $responseData = [];
        $responseData['status'] = 'OK';
        $responseData['timeStamp'] = TimeString::now();
        $responseData['witnesses'] = [];
        foreach($witnessArray as $i => $witness) {
            if (!isset($witness['id'])) {
                $msg = "No witness id given in witness $i" ;
                $this->logger->error($msg, [
                    'apiUserTid' => $this->apiUserId,
                    'apiError' => self::ERROR_UNKNOWN_WITNESS_TYPE
                ]);
                return $this->responseWithJson($response, [ 'error' => $msg ], 409);
            }
            $witnessId = $witness['id'];
            $witnessType = WitnessSystemId::getType($witnessId);
            switch ($witnessType) {
                case WitnessType::CHUNK_EDITION:
                case WitnessType::SOURCE:
                    // just say that chunk edition / source is up-to-date
                    $responseData['witnesses'][] = [
                        'id' => $witnessId,
                        'upToDate' => true,
                    ];
                    break;

                case WitnessType::FULL_TRANSCRIPTION:
                    $witnessInfo = WitnessSystemId::getFullTxInfo($witnessId);
                    $witnessStillDefined = true;
                    try {
                        $lastUpdate = $this->systemManager->getTranscriptionManager()->getLastChangeTimestampForWitness(
                            $witnessInfo->workId,
                            $witnessInfo->chunkNumber,
                            $witnessInfo->typeSpecificInfo['docId'],
                            $witnessInfo->typeSpecificInfo['localWitnessId']
                        );
                    } catch (Exception $e) {
                        if ($e->getCode() === ApmTranscriptionManager::ERROR_DOCUMENT_NOT_FOUND) {
                           $witnessStillDefined = false;
                        } else {
                            $this->debug("Exception getting last change time for witness", [
                                'msg' => $e->getMessage(),
                                'witnessInfo' => get_object_vars($witnessInfo)
                            ]);
                            return $this->responseWithJson($response, [ 'error' => 'Problem getting info', 'code' => 0], 409);
                        }
                    }
                    if ($witnessStillDefined) {
                        $upToDate = true;
                        if ($lastUpdate !== $witnessInfo->typeSpecificInfo['timeStamp']) {
                            $upToDate = false;
                        }
                        $updatedWitnessId = WitnessSystemId::buildFullTxId(
                            $witnessInfo->workId,
                            $witnessInfo->chunkNumber,
                            $witnessInfo->typeSpecificInfo['docId'],
                            $witnessInfo->typeSpecificInfo['localWitnessId'],
                            $lastUpdate
                        );
                        $responseData['witnesses'][] = [
                            'id' => $witnessId,
                            'upToDate' => $upToDate,
                            'lastUpdate' => $lastUpdate,
                            'updatedWitnessId'=> $updatedWitnessId
                        ];
                    }else {
                        $responseData['witnesses'][] = [
                            'id' => $witnessId,
                            'upToDate' => false,
                            'lastUpdate' => -1
                        ];
                        $this->debug("Witness $witnessId no longer defined in the system");
                    }
                    break;

                case WitnessType::PARTIAL_TRANSCRIPTION:
                    $msg = 'Witness type ' . WitnessType::PARTIAL_TRANSCRIPTION . ' not implemented yet';
                    $this->logger->error($msg, [
                        'apiUserTid' => $this->apiUserId,
                        'apiError' => self::ERROR_WITNESS_TYPE_NOT_IMPLEMENTED
                    ]);
                    return $this->responseWithJson($response, [ 'error' => $msg ], 409);




                default:
                    $msg = "Unknown witness type $witnessType";
                    $this->logger->error($msg, [
                        'apiUserTid' => $this->apiUserId,
                        'apiError' => self::ERROR_UNKNOWN_WITNESS_TYPE
                    ]);
                    return $this->responseWithJson($response, [ 'error' => $msg ], 409);
            }
        }
        return $this->responseWithJson($response, $responseData, 200);
    }

    private function getFullTxWitness(string $requestedWitnessId, string $outputType, Response $response, bool $useCache) : Response {
        $this->debugCode = false;
        try {
            $witnessInfo = WitnessSystemId::getFullTxInfo($requestedWitnessId);
        } catch (InvalidArgumentException $e) {
            $msg = "Cannot get fullTx witness info from system Id. Error: " . $e->getMessage();
            $this->logger->error($msg, [
                'apiUserTid' => $this->apiUserId,
                'apiError' => self::ERROR_SYSTEM_ID_ERROR,
                'exceptionErrorCode' => $e->getCode(),
                'exceptionErrorMsg' => $e->getMessage()
            ]);
            return $this->responseWithJson($response, [ 'error' => $msg], 409);
        }

        $workId = $witnessInfo->workId;
        $chunkNumber = $witnessInfo->chunkNumber;
        $docId = $witnessInfo->typeSpecificInfo['docId'];
        $localWitnessId = $witnessInfo->typeSpecificInfo['localWitnessId'];
        $timeStamp = $witnessInfo->typeSpecificInfo['timeStamp'];

        try {
            $docInfo = $this->systemManager->getDocumentManager()->getDocInfo($docId);
            $docLangCode = $this->systemManager->getLangCodeFromId($docInfo->language);
        } catch (DocumentNotFoundException|EntityDoesNotExistException $e) {
            // cannot get witness
            $msg = "Could not get doc info for witness '" . $requestedWitnessId;
            $this->logger->error($msg, [ 'exceptionError' => $e->getCode(), 'exceptionMsg' => $e->getMessage(), 'witness'=> $requestedWitnessId]);
            return $this->responseWithJson($response, ['error' => self::API_ERROR_RUNTIME_ERROR, 'msg' => $msg], HttpStatus::INTERNAL_SERVER_ERROR);
        }

        /** @var ApmTranscriptionManager $transcriptionManager */
        $transcriptionManager = $this->systemManager->getTranscriptionManager();


        $txManagerIsUsingCache = $transcriptionManager->isCacheInUse();

        if (!$useCache && $txManagerIsUsingCache) {
            // only turn off tx manager's cache if it's in use
            $this->codeDebug("Turning off tx manager's cache");
            $transcriptionManager->doNotUseCache();
        }

        // at this point we can check the cache
        $systemCache = $this->systemManager->getSystemDataCache();
        $cacheTracker = $this->systemManager->getCacheTracker();

        // if output is html it can be even faster
        if ($useCache && $outputType === 'html') {
            $this->codeDebug("Fast tracking html output: trying to get html from cache");
            $cacheKeyHtmlOutput = $this->getWitnessHtmlCacheKey($requestedWitnessId);
            $cacheHit = true;
            try {
                $cachedHtml = $systemCache->get($cacheKeyHtmlOutput);
            } catch (KeyNotInCacheException $e) {
                $this->codeDebug("Cache miss :(");
                $cacheTracker->incrementMisses();
                $cacheHit = false;
            }
            if ($cacheHit) {
                $this->codeDebug("Cache hit!!");
                $cacheTracker->incrementHits();
                return $this->responseWithText($response, $cachedHtml ?? 'Error');
            }
        }

        $cacheHit = true;
        if ($useCache) {
            $this->codeDebug("Trying to get full witness info from cache");
            $cacheKey = $this->getWitnessDataCacheKey($requestedWitnessId);
            try {
                $cachedBlob = $systemCache->get($cacheKey);
            } catch (KeyNotInCacheException) {
                $cacheTracker->incrementMisses();
                $cacheHit = false;
            }
        }
        if (!$useCache || !$cacheHit) {
            $this->codeDebug("Need to build witness info from scratch");
            // need to build everything from scratch
            $locations = $transcriptionManager->getSegmentLocationsForFullTxWitness($workId, $chunkNumber, $docId, $localWitnessId, $timeStamp);
            try {
                $apmWitness = $transcriptionManager->getTranscriptionWitness($workId, $chunkNumber, $docId, $localWitnessId, $timeStamp, $docLangCode);
            } catch (Exception $e) {
                $msg = $e->getMessage();
                $this->logger->error("Exception trying to get transcription witness. Msg = '$msg'",
                    [ 'locations' => $locations ] );
                return $this->responseWithJson($response, [ 'error' => $msg ], 409);
            }

            $returnData = $apmWitness->getData();

            // erase unneeded data
            // TODO: do not calculate this data in the first place!
            unset($returnData['tokens']);
            unset($returnData['items']);
            unset($returnData['nonTokenItemIndexes']);

            // temporary code to spit out standard token data
            $returnData['standardData'] = (new FullTxWitnessDataProvider($apmWitness))->getStandardData();


            $witnessId = WitnessSystemId::buildFullTxId($workId, $chunkNumber, $docId, $localWitnessId, $returnData['timeStamp']);
            $returnData['witnessId'] = $witnessId;
            $returnData['segments'] = $locations;

            $returnData['apiStatus']  = 'OK';
            $returnData['requestedWitnessId'] = $requestedWitnessId;

            // Plain text version
            //$returnData['plainText'] = $apmWitness->getPlainText();

            // HTML
            $html = $this->getWitnessHtml($apmWitness);

            // Save results in cache
            $cacheKey = $this->getWitnessDataCacheKey($witnessId);
            $cacheKeyHtmlOutput = $this->getWitnessHtmlCacheKey($witnessId);
            $this->codeDebug("Saving API response data to cache with key '$cacheKey'");
            $serializedReturnData = serialize($returnData);
            $this->codeDebug("Size of serialized return data: " . strlen($serializedReturnData));
            $dataToSave = gzcompress($serializedReturnData);
            $this->codeDebug("Size of compressed witness data: " . strlen($dataToSave));
            try {
                $systemCache->set($cacheKey, $dataToSave, self::WITNESS_DATA_CACHE_TTL);
            } catch (Exception $e) {
                $this->codeDebug("Error saving data to cache: " . substr($e->getMessage(), 1, 1000) . '...' );
            }

            // save html on its own key in the cache to speed up html output later
            $this->codeDebug("Saving html data to cache with key '$cacheKeyHtmlOutput'");
            $this->codeDebug("Size of html data: " . strlen($html));
            try {
                $systemCache->set($cacheKeyHtmlOutput, $html, self::WITNESS_DATA_CACHE_TTL);
            } catch(Exception $e) {
                $this->codeDebug("Error saving data to cache: " . substr($e->getMessage(), 1, 1000) . '...' );
            }

            $returnData['html'] = $html;

            if ($outputType === 'standardData') {
                // no need to get html data if we're just serving standardData
                $returnData = [ 'witnessData' => $returnData['standardData']];
                $returnData['apiStatus']  = 'OK';
            }

            $returnData['cached'] = false;
            $returnData['usingCache'] = $useCache;
        } else {
            //$this->codeDebug('Cache hit!');
            $cacheTracker->incrementHits();
            $returnData = unserialize(gzuncompress($cachedBlob));

            if ($outputType === 'standardData') {
                // no need to get html data if we're just serving standardData
                $returnData = [ 'witnessData' => $returnData['standardData']];
                $returnData['apiStatus']  = 'OK';
            } else {
                $cacheKeyHtmlOutput = $this->getWitnessHtmlCacheKey($requestedWitnessId);
                $cacheHit = true;
                try {
                    $html = $systemCache->get($cacheKeyHtmlOutput);
                } catch (KeyNotInCacheException $e) {
                    $cacheHit = false;
                }

                if (!$cacheHit) {
                    $cacheTracker->incrementMisses();
                    $this->codeDebug("Cache miss trying to get html output ");
                    $returnData['status'] = 'Error getting html from cache';
                }
                $cacheTracker->incrementHits();
                $returnData['html']  = $html;

            }
            $returnData['requestedWitnessId'] = $requestedWitnessId;
            $returnData['cached'] = true;
            $returnData['usingCache'] = $useCache;
        }

        // at this point we have all data either from the cache or built from scratch

        if (!$useCache && $txManagerIsUsingCache) {
            // turn on tx manager cache if we turned it off earlier
            $this->codeDebug("Turning tx manager's cache back on");
            $transcriptionManager->useCache();
        }

        if ($outputType === 'html') {
            return $this->responseWithText($response, $returnData['html']);
        }

        if ($outputType === 'deco1') {
            $this->codeDebug("Output deco1");
            $decorator = new SimpleHtmlWitnessDecorator();
            $theWitness = $transcriptionManager->getTranscriptionWitness($workId, $chunkNumber, $docId, $localWitnessId, $timeStamp);
            $theTokens = $decorator->getDecoratedTokens($theWitness);
            $html = '';
            foreach($theTokens as $decoratedToken) {
                $html .=  $decoratedToken;
            }
            return $this->responseWithText($response, $html);
        }

        if ($outputType === 'deco2') {
            $this->codeDebug("Output deco2");
            $decorator = new ApmTxWitnessDecorator();
            $decorator->setLogger($this->logger);
            $theWitness = $transcriptionManager->getTranscriptionWitness($workId, $chunkNumber, $docId, $localWitnessId, $timeStamp);
            $theTokens = $decorator->getDecoratedTokens($theWitness);
            return $this->responseWithJson($response, $theTokens);
        }

        return $this->responseWithJson($response, $returnData);
    }


    private function getWitnessHtml(ApmTranscriptionWitness $apmWitness) : string {
        $formatter = new WitnessPageFormatter();
        $personInfoProvider = new ApmPersonInfoProvider($this->systemManager->getPersonManager());
        $formatter->setPersonInfoProvider($personInfoProvider);
        return $formatter->formatItemStream($apmWitness->getDatabaseItemStream());
    }


    private function getWitnessDataCacheKey(string $witnessId): string
    {
        return self::WITNESS_DATA_CACHE_KEY_PREFIX . $witnessId;
    }

    private function getWitnessHtmlCacheKey(string $witnessId): string
    {
        return $this->getWitnessDataCacheKey($witnessId) . self::WITNESS_HTML_CACHE_KEY_POSTFIX;
    }

}