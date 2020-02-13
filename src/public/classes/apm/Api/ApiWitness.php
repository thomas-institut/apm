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
use APM\System\WitnessInfo;
use APM\System\WitnessSystemId;
use APM\System\WitnessType;
use AverroesProjectToApm\ApUserDirectory;
use AverroesProjectToApm\Formatter\WitnessPageFormatter;
use InvalidArgumentException;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use ThomasInstitut\TimeString\TimeString;


class ApiWitness extends ApiController
{

    const ERROR_WITNESS_TYPE_NOT_IMPLEMENTED = 1001;
    const ERROR_UNKNOWN_WITNESS_TYPE = 1002;
    const ERROR_SYSTEM_ID_ERROR = 1003;

    public function getWitness(Request $request, Response $response) {

        $witnessId = $request->getAttribute('witnessId');
        $this->profiler->start();
        $outputType = $request->getAttribute('outputType', 'full');

        $witnessType = WitnessSystemId::getType($witnessId);

        switch ($witnessType) {
            case WitnessType::FULL_TRANSCRIPTION:
                $newResponse =  $this->getFullTxWitness($witnessId, $outputType, $response);
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

    private function getFullTxWitness(string $witnessId, string $outputType, Response $response) : Response {
        //$witnessInfo = new WitnessInfo();
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
        $compactTimeStamp = $witnessInfo->typeSpecificInfo['timeStamp'];

        $returnData = [
            'status' => 'OK',
            'requestedWitnessId' => $witnessId,
            'workId' => $workId,
            'chunkNumber' => $chunkNumber,
            'docId' => $docId,
            'localWitnessId' => $localWitnessId,
            'timeStamp' => $compactTimeStamp
        ];

        $transcriptionManager = $this->systemManager->getTranscriptionManager();

        $timeStamp = '';
        if ($compactTimeStamp === '') {
            $chunkWitnesses = $transcriptionManager->getWitnessesForChunk($workId, $chunkNumber);
            $witnessFound = false;
            foreach ($chunkWitnesses as $chunkWitnessInfo) {
                /** @var WitnessInfo $chunkWitnessInfo */
                $witnessDocId = $chunkWitnessInfo->typeSpecificInfo['docId'];
                $witnessLocalWitnessId = $chunkWitnessInfo->typeSpecificInfo['localWitnessId'];
                if ($witnessDocId === $docId && $witnessLocalWitnessId === $localWitnessId) {
                    $witnessFound = true;
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
        } else {
            $timeStamp = TimeString::compactDecode($compactTimeStamp);
        }

        $returnData['timeStamp'] = $timeStamp;
        $returnData['witnessId'] = WitnessSystemId::buildFullTxId($workId, $chunkNumber, $docId, $localWitnessId, $timeStamp);

        $locations = $transcriptionManager->getSegmentLocationsForFullTxWitness($workId, $chunkNumber, $docId, $localWitnessId, $timeStamp);

        //$this->debug('Locations', $locations);

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

        if ($outputType === 'data') {
            return $this->responseWithJson($response, $returnData, 200);
        }

        // HTML
        $userDirectory = new ApUserDirectory($this->getDataManager()->userManager);
        $formatter = new WitnessPageFormatter($userDirectory);
        $html = $formatter->formatItemStream($apmWitness->getDatabaseItemStream());
        $returnData['html'] = $html;

        if ($outputType === 'html') {
            return $this->responseWithText($response, $html);
        }

        // Plain text version
        $returnData['plainText'] = $apmWitness->getPlainText();

        return $this->responseWithJson($response, $returnData, 200);
    }
}