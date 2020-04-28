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
use APM\FullTranscription\ApmTranscriptionWitness;
use APM\StandardData\FullTxWitnessDataProvider;
use APM\System\ApmTranscriptionManager;
use APM\System\WitnessSystemId;
use APM\System\WitnessType;
use AverroesProject\Data\UserManagerUserInfoProvider;
use AverroesProjectToApm\Formatter\WitnessPageFormatter;
use InvalidArgumentException;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\DataCache\KeyNotInCacheException;
use ThomasInstitut\TimeString\TimeString;


class ApiWitness extends ApiController
{

    const ERROR_WITNESS_TYPE_NOT_IMPLEMENTED = 1001;
    const ERROR_UNKNOWN_WITNESS_TYPE = 1002;
    const ERROR_SYSTEM_ID_ERROR = 1003;

    const WITNESS_DATA_CACHE_KEY_PREFIX = 'ApiWitness-witnessdata-';
    const WITNESS_HTML_CACHE_KEY_POSTFIX = '-html';

    public function getWitness(Request $request, Response $response) {

        $witnessId = $request->getAttribute('witnessId');
        $this->profiler->start();
        $outputType = $request->getAttribute('outputType', 'full');
        $useCache = $request->getAttribute('cache',  'usecache') === 'usecache';

        $witnessType = WitnessSystemId::getType($witnessId);

        switch ($witnessType) {
            case WitnessType::FULL_TRANSCRIPTION:
                $newResponse =  $this->getFullTxWitness($witnessId, $outputType, $response, $useCache);
                $this->profiler->stop();
                $this->logProfilerData('API-getWitness ' . $witnessId . ' output ' . $outputType);
                return $newResponse;

            case WitnessType::PARTIAL_TRANSCRIPTION:
                $msg = 'Witness type ' . WitnessType::PARTIAL_TRANSCRIPTION . ' not implemented yet';
                $this->logger->error($msg, [
                    'apiUserId' => $this->apiUserId,
                    'apiError' => self::ERROR_WITNESS_TYPE_NOT_IMPLEMENTED
                ]);
                return $this->responseWithJson($response, [ 'error' => $msg ], 409);

            default:
                $msg = "Unknown witness type $witnessType";
                $this->logger->error($msg, [
                    'apiUserId' => $this->apiUserId,
                    'apiError' => self::ERROR_UNKNOWN_WITNESS_TYPE
                ]);
                return $this->responseWithJson($response, [ 'error' => $msg ], 409);
        }
    }

    public function checkWitnessUpdates(Request $request, Response $response) {
        $apiCall = 'checkWitnessUpdates';
        $this->profiler->start();
        $inputData = $this->checkAndGetInputData($request, $response, $apiCall, ['witnesses']);
        //$this->debug('Input data', [ $inputData ]);
        if (!is_array($inputData)) {
            return $inputData;
        }

        $witnessArray = $inputData['witnesses'];
        $responseData = [];
        $responseData['status'] = 'OK';
        $responseData['timeStamp'] = TimeString::now();
        $responseData['witnesses'] = [];
        foreach($witnessArray as $i => $witness) {
            if (!isset($witness['id'])) {
                $msg = 'No witness id given in witness $i';
                $this->logger->error($msg, [
                    'apiUserId' => $this->apiUserId,
                    'apiError' => self::ERROR_UNKNOWN_WITNESS_TYPE
                ]);
                return $this->responseWithJson($response, [ 'error' => $msg ], 409);
            }
            $witnessId = $witness['id'];
            $witnessType = WitnessSystemId::getType($witnessId);
            switch ($witnessType) {
                case WitnessType::FULL_TRANSCRIPTION:
                    $witnessInfo = WitnessSystemId::getFullTxInfo($witnessId);
                    $lastUpdate = $this->systemManager->getTranscriptionManager()->getLastChangeTimestampForWitness(
                      $witnessInfo->workId,
                      $witnessInfo->chunkNumber,
                      $witnessInfo->typeSpecificInfo['docId'],
                      $witnessInfo->typeSpecificInfo['localWitnessId']
                    );
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
                    break;

                case WitnessType::PARTIAL_TRANSCRIPTION:
                    $msg = 'Witness type ' . WitnessType::PARTIAL_TRANSCRIPTION . ' not implemented yet';
                    $this->logger->error($msg, [
                        'apiUserId' => $this->apiUserId,
                        'apiError' => self::ERROR_WITNESS_TYPE_NOT_IMPLEMENTED
                    ]);
                    $this->profiler->stop();
                    $this->logProfilerData($apiCall . '-error');
                    return $this->responseWithJson($response, [ 'error' => $msg ], 409);

                default:
                    $msg = "Unknown witness type $witnessType";
                    $this->logger->error($msg, [
                        'apiUserId' => $this->apiUserId,
                        'apiError' => self::ERROR_UNKNOWN_WITNESS_TYPE
                    ]);
                    $this->profiler->stop();
                    $this->logProfilerData($apiCall . '-error');
                    return $this->responseWithJson($response, [ 'error' => $msg ], 409);
            }
        }
        $this->profiler->stop();
        $this->logProfilerData($apiCall);
        return $this->responseWithJson($response, $responseData, 200);
    }

    private function getFullTxWitness(string $requestedWitnessId, string $outputType, Response $response, bool $useCache) : Response {
        try {
            $witnessInfo = WitnessSystemId::getFullTxInfo($requestedWitnessId);
        } catch (InvalidArgumentException $e) {
            $msg = "Cannot get fullTx witness info from system Id. Error: " . $e->getMessage();
            $this->logger->error($msg, [
                'apiUserId' => $this->apiUserId,
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
            $cacheKeyHtmlOutput = $this->getWitnessHtmlCacheKey($requestedWitnessId);
            $cacheHit = true;
            try {
                $cachedHtml = $systemCache->get($cacheKeyHtmlOutput);
            } catch (KeyNotInCacheException $e) {
                //$this->codeDebug("Cache miss :(");
                $cacheTracker->incrementMisses();
                $cacheHit = false;
            }
            if ($cacheHit) {
                //$this->codeDebug("Cache hit!!");
                $cacheTracker->incrementHits();
                return $this->responseWithText($response, $cachedHtml);
            }
        }

        $cacheHit = true;
        if ($useCache) {
            $cacheKey = $this->getWitnessDataCacheKey($requestedWitnessId);
            try {
                $cachedBlob = $systemCache->get($cacheKey);
            } catch (KeyNotInCacheException $e) {
                $cacheTracker->incrementMisses();
                $cacheHit = false;
            }
        }
        if (!$useCache || !$cacheHit) {
            // need to build everything from scratch
            $locations = $transcriptionManager->getSegmentLocationsForFullTxWitness($workId, $chunkNumber, $docId, $localWitnessId, $timeStamp);
            $apmWitness = $transcriptionManager->getTranscriptionWitness($workId, $chunkNumber, $docId, $localWitnessId, $timeStamp);

            $returnData = $apmWitness->getData();

            // temporary code to spit out standard token data
            $returnData['standardData'] = (new FullTxWitnessDataProvider($apmWitness))->getStandardData();


            $witnessId = WitnessSystemId::buildFullTxId($workId, $chunkNumber, $docId, $localWitnessId, $returnData['timeStamp']);
            $returnData['witnessId'] = $witnessId;
            $returnData['segments'] = $locations;

            $returnData['apiStatus']  = 'OK';
            $returnData['requestedWitnessId'] = $requestedWitnessId;

            // Plain text version
            $returnData['plainText'] = $apmWitness->getPlainText();

            // HTML
            $html = $this->getWitnessHtml($apmWitness);

            // Save results in cache
            $cacheKey = $this->getWitnessDataCacheKey($witnessId);
            $cacheKeyHtmlOutput = $this->getWitnessHtmlCacheKey($witnessId);
            $systemCache->set($cacheKey, serialize($returnData));
            // save html on its own key in the cache to speed up html output later
            $systemCache->set($cacheKeyHtmlOutput, $html);

            $returnData['html'] = $html;

            $returnData['cached'] = false;
            $returnData['usingCache'] = $useCache;

        } else {
            //$this->codeDebug('Cache hit!');
            $cacheTracker->incrementHits();
            $returnData = unserialize($cachedBlob);

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

        return $this->responseWithJson($response, $returnData, 200);
    }


    private function getWitnessHtml(ApmTranscriptionWitness $apmWitness) : string {
        $formatter = new WitnessPageFormatter();
        $uip = new UserManagerUserInfoProvider($this->getDataManager()->userManager);
        $formatter->setPersonInfoProvider($uip);
        return $formatter->formatItemStream($apmWitness->getDatabaseItemStream());
    }


    private function getWitnessDataCacheKey(string $witnessId) {
        return self::WITNESS_DATA_CACHE_KEY_PREFIX . $witnessId;
    }

    private function getWitnessHtmlCacheKey(string $witnessId) {
        return $this->getWitnessDataCacheKey($witnessId) . self::WITNESS_HTML_CACHE_KEY_POSTFIX;
    }

}