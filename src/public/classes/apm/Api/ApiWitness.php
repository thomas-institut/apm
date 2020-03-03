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


use APM\Core\Token\TranscriptionToken;
use APM\Core\Transcription\ItemInDocument;
use APM\Core\Witness\SimpleHtmlWitnessDecorator;
use APM\Decorators\Witness\ApmTxWitnessDecorator;
use APM\FullTranscription\ApmTranscriptionWitness;
use APM\System\WitnessInfo;
use APM\System\WitnessSystemId;
use APM\System\WitnessType;
use AverroesProject\Data\UserManagerUserInfoProvider;
use AverroesProjectToApm\Formatter\WitnessPageFormatter;
use InvalidArgumentException;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\DataCache\KeyNotInCacheException;


class ApiWitness extends ApiController
{

    const ERROR_WITNESS_TYPE_NOT_IMPLEMENTED = 1001;
    const ERROR_UNKNOWN_WITNESS_TYPE = 1002;
    const ERROR_SYSTEM_ID_ERROR = 1003;

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

    private function getFullTxWitness(string $witnessId, string $outputType, Response $response, bool $useCache) : Response {
        try {
            $witnessInfo = WitnessSystemId::getFullTxInfo($witnessId);
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

        $this->codeDebug('UseCache', [$useCache]);
        $returnData = [
            'status' => 'OK',
            'requestedWitnessId' => $witnessId,
            'workId' => $workId,
            'chunkNumber' => $chunkNumber,
            'docId' => $docId,
            'localWitnessId' => $localWitnessId,
            'timeStamp' => $timeStamp,
        ];

        $transcriptionManager = $this->systemManager->getTranscriptionManager();

        if ($timeStamp === '') {
            $this->codeDebug('Timestamp is empty');
            $chunkWitnesses = $transcriptionManager->getWitnessesForChunk($workId, $chunkNumber);
            $witnessFound = false;
            foreach ($chunkWitnesses as $chunkWitnessInfo) {
                /** @var WitnessInfo $chunkWitnessInfo */
                $witnessDocId = $chunkWitnessInfo->typeSpecificInfo['docId'];
                $witnessLocalWitnessId = $chunkWitnessInfo->typeSpecificInfo['localWitnessId'];
                if ($witnessDocId === $docId && $witnessLocalWitnessId === $localWitnessId) {
                    $witnessFound = true;
                    $this->codeDebug("Setting timestamp:  $timeStamp");
                    $timeStamp = $chunkWitnessInfo->typeSpecificInfo['timeStamp'];
                    break;
                }
            }
            if (!$witnessFound) {
                $msg = 'No witness found';
                $returnData['status'] = 'Error';
                $returnData['errorMessage'] = $msg;
                $this->debug($msg, $returnData);
                return $this->responseWithJson($response, $returnData, 409);
            }
        }

        $returnData['timeStamp'] = $timeStamp;
        $returnData['witnessId'] = WitnessSystemId::buildFullTxId($workId, $chunkNumber, $docId, $localWitnessId, $timeStamp);

        // at this point we can check the cache
        $systemCache = $this->systemManager->getSystemDataCache();
        $cacheTracker = $this->systemManager->getCacheTracker();
        $cacheKey = 'ApiWitness-witnessdata-' . $returnData['witnessId'];
        $cacheKeyHtmlOutput = $cacheKey . '-html';

        // if output is html it can be even faster
        if ($useCache && $outputType === 'html') {
            //$this->codeDebug("Checking system cache for key $cacheKeyHtmlOutput");
            $cacheMiss = false;
            try {
                $cachedHtml = $systemCache->get($cacheKeyHtmlOutput);
            } catch (KeyNotInCacheException $e) {
                //$this->codeDebug("Cache miss :(");
                $cacheTracker->incrementMisses();
                $cacheMiss = true;
            }
            if (!$cacheMiss) {
                //$this->codeDebug("Cache hit!!");
                $cacheTracker->incrementHits();
                return $this->responseWithText($response, $cachedHtml);
            }
        }

        $cacheMiss = false;
        if ($useCache) {
            //$this->codeDebug("Checking system cache for key $cacheKey");
            try {
                $cachedBlob = $systemCache->get($cacheKey);
            } catch (KeyNotInCacheException $e) {
                $cacheTracker->incrementMisses();
                $cacheMiss = true;
            }
        }

        if (!$useCache || $cacheMiss) {

            $locations = $transcriptionManager->getSegmentLocationsForFullTxWitness($workId, $chunkNumber, $docId, $localWitnessId, $timeStamp);

            $returnData['segments'] = $locations;

            $apmWitness = $transcriptionManager->getTranscriptionWitness($workId, $chunkNumber, $docId, $localWitnessId, $timeStamp);

            // Items
            $itemArray = [];
            $itemWithAddressArray = $apmWitness->getItemWithAddressArray();
            foreach($itemWithAddressArray as $itemIndex => $itemWithAddress) {
                /** @var ItemInDocument $itemWithAddress */
                $theItem = $itemWithAddress->getItem();
                $theAddress = $itemWithAddress->getAddress();
                $itemData = [];
                $itemData['address'] = $theAddress->getData();
                $itemData['item'] = $theItem->getData();
                $itemData['class'] = 'ItemInDocument';
                $itemArray[] = $itemData;
            }
            $returnData['items'] = $itemArray;

            // Tokens
            $tokens = $apmWitness->getTokens();
            $tokenArray = [];
            foreach($tokens as $token) {
                /** @var TranscriptionToken $token */
                $tokenArray[] = $token->getData();
            }
            $returnData['tokens'] = $tokenArray;

            // Plain text version
            $returnData['plainText'] = $apmWitness->getPlainText();

            // HTML
            $html = $this->getWitnessHtml($apmWitness);

            $systemCache->set($cacheKey, serialize($returnData));
            // save html on its own key in the cache to speed up html output later
            $systemCache->set($cacheKeyHtmlOutput, $html);

            $returnData['html'] = $html;

            $returnData['cached'] = false;
            $returnData['usingCache'] = $useCache;

        } else {
            //$this->codeDebug('Cache hit!');
            $cacheTracker->incrementHits();
            $requestedWitnessId = $returnData['requestedWitnessId'];
            $returnData = unserialize($cachedBlob);

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
}