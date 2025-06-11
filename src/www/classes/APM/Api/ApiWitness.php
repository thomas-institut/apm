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

use APM\Api\ItemStreamFormatter\WitnessPageFormatter;
use APM\Api\PersonInfoProvider\ApmPersonInfoProvider;
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
use Exception;
use InvalidArgumentException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use ThomasInstitut\DataCache\ItemNotInCacheException;
use ThomasInstitut\TimeString\TimeString;


class ApiWitness extends ApiController
{

    const string CLASS_NAME = 'Witnesses';

    const int ERROR_WITNESS_TYPE_NOT_IMPLEMENTED = 1001;
    const int ERROR_UNKNOWN_WITNESS_TYPE = 1002;
    const int ERROR_SYSTEM_ID_ERROR = 1003;

    const string WITNESS_DATA_CACHE_KEY_PREFIX = 'Api:Witness:WitnessData:';
    const string WITNESS_HTML_CACHE_KEY_POSTFIX = ':html';

    const int WITNESS_DATA_CACHE_TTL = 60 * 24 * 3600; // 30 days

    public function getWitness(Request $request, Response $response): Response
    {

        $witnessId = $request->getAttribute('witnessId');
        $this->setApiCallName(self::CLASS_NAME . ':' . __FUNCTION__ . ":" . $witnessId);
        
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

        $systemCache = $this->systemManager->getSystemDataCache();

        // Fast track html
        if ($useCache && $outputType === 'html') {
            $this->codeDebug("Fast tracking html output: trying to get html from cache");
            $cacheKeyHtmlOutput = $this->getWitnessHtmlCacheKey($requestedWitnessId);
            try {
                $cachedHtml = $systemCache->get($cacheKeyHtmlOutput);
                $this->codeDebug("Cache hit!!");
                return $this->responseWithText($response, $cachedHtml);
            } catch (ItemNotInCacheException) {
                // just keep going
            }
        }

        /** @var ApmTranscriptionManager $transcriptionManager */
        $transcriptionManager = $this->systemManager->getTranscriptionManager();

        $txManagerIsUsingCache = $transcriptionManager->isCacheInUse();
        if (!$useCache && $txManagerIsUsingCache) {
            // only turn off tx manager's cache if it's in use
            $this->codeDebug("Turning off tx manager's cache");
            $transcriptionManager->doNotUseCache();
        }

        $locations = $transcriptionManager->getSegmentLocationsForFullTxWitness($workId, $chunkNumber, $docId, $localWitnessId, $timeStamp);
        try {
            $apmWitness = $transcriptionManager->getTranscriptionWitness($workId, $chunkNumber, $docId, $localWitnessId, $timeStamp, $docLangCode);
        } catch (Exception $e) {
            $msg = $e->getMessage();
            $this->logger->error("Exception trying to get transcription witness. Msg = '$msg'",
                [ 'locations' => $locations ] );
            return $this->responseWithJson($response, [ 'error' => $msg ], 409);
        }
        $witnessId = WitnessSystemId::buildFullTxId($workId, $chunkNumber, $docId, $localWitnessId, $apmWitness->getTimeStamp());
        $html = $this->getWitnessHtml($apmWitness);
        $systemCache->set($this->getWitnessHtmlCacheKey($witnessId), $html, self::WITNESS_DATA_CACHE_TTL);
        if ($outputType === 'html') {
            // no need to further if only html is required
            return $this->responseWithText($response, $html);
        }

        $returnData = $apmWitness->getData();

        // erase unneeded data
        unset($returnData['tokens']);
        unset($returnData['items']);
        unset($returnData['nonTokenItemIndexes']);
        // temporary code to spit out standard token data
        $returnData['standardData'] = (new FullTxWitnessDataProvider($apmWitness))->getStandardData();
        $returnData['witnessId'] = $witnessId;
        $returnData['segments'] = $locations;
        $returnData['requestedWitnessId'] = $requestedWitnessId;
        $returnData['html'] = $html;
        $returnData['apiStatus']  = 'OK';
        if ($outputType === 'standardData') {
            $returnData = [ 'witnessData' => $returnData['standardData']];
            $returnData['apiStatus']  = 'OK';
        }
        $returnData['cached'] = false;
        $returnData['usingCache'] = $useCache;

        if (!$useCache && $txManagerIsUsingCache) {
            // turn on tx manager cache if we turned it off earlier
            $this->codeDebug("Turning tx manager's cache back on");
            $transcriptionManager->useCache();
        }

//     TODO: Erase this eventually, I don't think it's needed anywhere

//        if ($outputType === 'deco1') {
//            $this->codeDebug("Output deco1");
//            $decorator = new SimpleHtmlWitnessDecorator();
//            $theWitness = $transcriptionManager->getTranscriptionWitness($workId, $chunkNumber, $docId, $localWitnessId, $timeStamp);
//            $theTokens = $decorator->getDecoratedTokens($theWitness);
//            $html = '';
//            foreach($theTokens as $decoratedToken) {
//                $html .=  $decoratedToken;
//            }
//            return $this->responseWithText($response, $html);
//        }
//
//        if ($outputType === 'deco2') {
//            $this->codeDebug("Output deco2");
//            $decorator = new ApmTxWitnessDecorator();
//            $decorator->setLogger($this->logger);
//            $theWitness = $transcriptionManager->getTranscriptionWitness($workId, $chunkNumber, $docId, $localWitnessId, $timeStamp);
//            $theTokens = $decorator->getDecoratedTokens($theWitness);
//            return $this->responseWithJson($response, $theTokens);
//        }

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