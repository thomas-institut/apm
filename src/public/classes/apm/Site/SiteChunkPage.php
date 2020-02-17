<?php

/* 
 *  Copyright (C) 2019-20 Universität zu Köln
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

/**
 * @brief Site Controller class
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */


namespace APM\Site;

//use APM\Core\Address\Point;
//use APM\Core\Address\PointRange;
//use APM\Core\Token\TokenType;
//use APM\Core\Token\TranscriptionToken;
use APM\FullTranscription\ApmChunkSegmentLocation;
use APM\FullTranscription\ColumnVersionInfo;
use APM\System\WitnessType;
use AverroesProject\Data\DataManager;
//use AverroesProjectToApm\ApUserDirectory;
//use AverroesProjectToApm\DatabaseItemStream;
//use AverroesProjectToApm\DatabaseItemStreamWitness;
//use AverroesProjectToApm\Formatter\WitnessPageFormatter;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;

//use AverroesProject\ItemStream\ItemStream;


/**
 * Site Controller class
 *
 */
class SiteChunkPage extends SiteController
{

    public function singleChunkPage(Request $request, Response $response)
    {
       
        $dm = $this->dataManager;
        $transcriptionManager = $this->systemManager->getTranscriptionManager();
        $workId = $request->getAttribute('work');
        $chunkNumber = $request->getAttribute('chunk');
        $this->profiler->start();
        $workInfo = $dm->getWorkInfo($workId);

        $witnessInfoArray = $transcriptionManager->getWitnessesForChunk($workId, $chunkNumber);

        // get pages, authors and languages from witnesses
        $pagesMentioned = [];
        $authorsMentioned = [];

        $languageInfoArray = [];

        foreach($witnessInfoArray as $witnessInfo) {
            switch($witnessInfo->type) {
                case WitnessType::FULL_TRANSCRIPTION:
                    $docInfo = $witnessInfo->typeSpecificInfo['docInfo'];
                    if (!isset($languageInfoArray[$docInfo->languageCode])) {
                        $languageInfoArray[$docInfo->languageCode] = $this->languagesByCode[$docInfo->languageCode];
                        $languageInfoArray[$docInfo->languageCode]['totalWitnesses'] = 0;
                        $languageInfoArray[$docInfo->languageCode]['validWitnesses'] = 0;
                    }
                    $languageInfoArray[$docInfo->languageCode]['totalWitnesses']++;
                    if ($witnessInfo->isValid) {
                        $languageInfoArray[$docInfo->languageCode]['validWitnesses']++;
                    }
                    $lastVersion = $witnessInfo->typeSpecificInfo['lastVersion'];
                    /** @var $lastVersion ColumnVersionInfo */
                    $authorsMentioned[] = $lastVersion->authorId;
                    $pagesMentioned[] = $lastVersion->pageId;
                    $segmentArray =  $witnessInfo->typeSpecificInfo['segments'];
                    foreach ($segmentArray as $segment) {
                        /** @var $segment ApmChunkSegmentLocation */
                        $pagesMentioned[] = $segment->start->pageId;
                        $pagesMentioned[] = $segment->end->pageId;
                    }
                    break;
                default:
                    $this->logger->error('Unsupported witness type');
            }
        }

        $pageInfoArray = $this->getPageInfoArrayFromList($pagesMentioned, $transcriptionManager->getPageManager());
        $authorInfoArray = $this->getAuthorInfoArrayFromList($authorsMentioned, $dm->userManager);

        $showAdminInfo = false;
        if ($dm->userManager->isUserAllowedTo($this->userInfo['id'], 'witness-view-details')) {
            $showAdminInfo = true;
        }

        $validChunks = $this->dataManager->getChunksWithTranscriptionForWorkId($workId);

        $this->profiler->stop();
        $this->logProfilerData("ChunkPage-$workId-$chunkNumber");
        return $this->renderPage($response, 'chunkpage.twig', [
            'work' => $workId,
            'chunk' => $chunkNumber,
            'work_info' => $workInfo,
            'showAdminInfo' => $showAdminInfo,
            'witnessInfoArray' => $witnessInfoArray,
            'authorInfo' => $authorInfoArray,
            'pageInfo' => $pageInfoArray,
            'languageInfo' => $languageInfoArray,
            'validChunks' => $validChunks
        ]);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
//    public function witnessPage(Request $request, Response $response){
//
//        $dm = $this->dataManager;
//        $workId = $request->getAttribute('work');
//        $chunkNumber = intval($request->getAttribute('chunk'));
//        $type = $request->getAttribute('type');
//        $this->profiler->start();
//        $workInfo = $dm->getWorkInfo($workId);
//
//        $witnessId =  $request->getAttribute('id');
//
//        if ($type !== WitnessType::FULL_TRANSCRIPTION) {
//            $this->logger->info('Unsupported witness type', [ 'type' => $type, 'workId' => $workId, 'chunk' => $chunkNumber, 'id' => $witnessId]);
//            return $this->responseWithText($response, 'Unsupported witness type ' . $type);
//        }
//        // Only full transcriptions are supported for the time being
//        $docId = 0;
//        $localWitnessId = 'A';
//        //$timeStamp = TimeString::now();
//        $timeStamp = '';
//        $wIdFields = explode('-', $witnessId);
//        if (isset($wIdFields[0])) {
//            $docId = intval($wIdFields[0]);
//        }
//        if (isset($wIdFields[1])) {
//            $localWitnessId = $wIdFields[1];
//        }
//
//        $this->logger->debug("Witness page ",
//            [
//                'type' => $type,
//                'workId' => $workId,
//                'chunk' => $chunkNumber,
//                'id' => $witnessId,
//                'docId' => $docId,
//                'localWitnessId' => $localWitnessId,
//                'timeStamp' => $timeStamp
//                ]);
//
//        // TODO: support timestamp
//
//
//        $docData = $dm->getDocById($docId);
//
//        $outputType = $request->getAttribute('output', 'full');
//        $this->logger->debug('Witness page with output type: ' . $outputType);
//
//        $essentialDocData = $this->buildEssentialWitnessDataFromDocData($docData, $workId, $chunkNumber, $dm, $localWitnessId, 1);
//        if (!$essentialDocData['goodWitness']) {
//             return $this->responseWithText($response,"Bad witness");
//        }
//        $doc = $this->buildWitnessDataFromDocData($essentialDocData, $workId, $chunkNumber, $dm, 1);
//
//        if ($doc['goodWitness'] && $outputType === 'full') {
//            $doc['itemStreamDump'] =  print_r($doc['itemStream'], true);
//            $doc['segmentsDump'] = print_r($doc['segments'], true);
//            $nonTokenItems = $doc['itemStreamWitness']->getNonTokenItemIndexes();
//            //$doc['nonTokenItems'] = print_r($nonTokenItems, true);
//            $doc['tokenDump'] = $this->prettyPrintTokens($doc['tokens'], $nonTokenItems);
//
//
//            ob_start();
//                var_dump($doc['segmentApItemStreams']);
//                $doc['segmentsDataDump'] = ob_get_contents();
//            ob_end_clean();
//
//            $doc['segmentsJSON'] = json_encode($doc['segmentApItemStreams'] );
//            $this->profiler->stop();
//            $this->logProfilerData("WitnessPage-$workId-$chunkNumber-$docId (full output)");
//            return $this->renderPage($response, 'witness.twig', [
//                'work' => $workId,
//                'chunk' => $chunkNumber,
//                'type' => $type,
//                'witnessid' => $docId . '-' . $localWitnessId,
//                'work_info' => $workInfo,
//                'doc' => $doc
//            ]);
//        }
//        $this->profiler->stop();
//        if ($outputType === 'text') {
//
//            $this->logProfilerData("WitnessPage-$workId-$chunkNumber-$docId (text output)");
//            return $this->responseWithText($response,$doc['plain_text']);
//        }
//
//        if ($outputType === 'html') {
//            $this->logProfilerData("WitnessPage-$workId-$chunkNumber-$docId (html output)");
//            return $this->responseWithText($response,$doc['formatted']);
//        }
//
//        return $this->responseWithText($response, 'ERROR: unrecognized output option', 402);
//    }

    /**
     * @param array $docData
     * @param string $workId
     * @param int $chunkNumber
     * @param DataManager $db
     * @param int $witnessNumber
     * @return array
     */
//    protected function buildEssentialWitnessDataFromDocData(array $docData, string $workId, int $chunkNumber, DataManager $db, string $localWitnessId, int $witnessNumber) : array  {
//        $doc = $docData;
//        $doc['number'] = $witnessNumber;
//        $doc['errors'] = [];
//        $doc['warnings'] = [];
//        $doc['goodWitness'] = true;
//        $doc['plain_text'] = '';
//        $doc['segmentApItemStreams'] = [];
//        $locations = $db->getChunkLocationsForDoc($docData['id'], $workId, $chunkNumber, $localWitnessId);
//        if (count($locations)===0) {
//            // @codeCoverageIgnoreStart
//            // Can't reproduce this in testing, it's actually a very unlikely error!
//            // It will only happen if in the time between getting the list of documents
//            // for the given chunk and actually getting the chunk location for one
//            // of those documents, somebody changes the document and erases the chunk marks
//            $doc['errors'][] =  'Error in chunk info, did somebody just erased the chunks in this document? Please refresh';
//            $doc['plain_text'] = '';
//            $doc['goodWitness'] = false;
//            return $doc;
//            // @codeCoverageIgnoreEnd
//        }
//        $doc['segments'] = $locations;
//
//        $doc['pageSpan'] = 0;
//        $lastTime = '0000-00-00 00:00:00.000000';
//        $lastAuthorId = 0;
//        $lastAuthorName = '';
//        $lastAuthorUsername = '';
//        foreach($locations as $segLocation ) {
//            if (!$segLocation['valid']) {
//                foreach($segLocation['warnings'] as $w) {
//                    $doc['warnings'][] = $w;
//                }
//                $doc['goodWitness'] = false;
//                continue;
//            }
//            $doc['pageSpan'] += $this->pageSpan($segLocation);
//            if (strcmp($lastTime, $segLocation['lastTime']) < 0) {
//                $lastTime = $segLocation['lastTime'];
//                $lastAuthorName = $segLocation['lastAuthorName'];
//                $lastAuthorId = $segLocation['lastAuthorId'];
//                $lastAuthorUsername = $segLocation['lastAuthorUsername'];
//            }
//        }
//        $doc['lastTime'] = $lastTime;
//        $doc['lastTimeFormatted'] = explode('.', $lastTime)[0];
//        $doc['lastAuthorName'] = $lastAuthorName;
//        $doc['lastAuthorId'] = $lastAuthorId;
//        $doc['lastAuthorUsername'] = $lastAuthorUsername;
//        return $doc;
//    }

//
//    protected function buildWitnessDataFromDocData(array $docData, string $workId, int $chunkNumber, DataManager $db, $witnessNumber) : array  {
//        $doc = $docData;
//        $locations = $doc['segments'];
//        $itemIds = [];
//        foreach($locations as $segLocation ) {
//            if ($segLocation['valid']) {
//                $apItemStream = $db->getItemStreamBetweenLocations((int) $doc['id'], $segLocation['start'], $segLocation['end']);
//                foreach($apItemStream as $row) {
//                    $itemIds[] = (int) $row['id'];
//                }
//                $doc['segmentApItemStreams'][] = $apItemStream;
//                $doc['plain_text'] .= ItemStream::getPlainText($apItemStream) . ' ';
//            }
//        }
//
//
//        $edNoteArrayFromDb =  $db->edNoteManager->rawGetEditorialNotesForListOfItems($itemIds);
//
//        $itemStream = new DatabaseItemStream($doc['id'], $doc['segmentApItemStreams'], $doc['lang'], $edNoteArrayFromDb);
//        $itemStreamWitness = new DatabaseItemStreamWitness($workId, $chunkNumber, $itemStream);
//        $doc['itemStreamWitness'] = $itemStreamWitness;
//        $doc['tokens'] = $itemStreamWitness->getTokens();
//        //$this->logger->debug('Doc ' . $docData['id'] . ':: tokens: ' . count($doc['tokens']) . ', page span: ' . $docData['pageSpan']);
//
//        $doc['itemStream'] = $itemStream;
//        $edNotes = $db->edNoteManager->getEditorialNotesForListOfItems($itemIds);
//        $noteAuthorIds = [];
//        foreach($edNotes as $edNote) {
//            $noteAuthorIds[$edNote->authorId] = 1;
//        }
//        $noteAuthorNames=[];
//        foreach(array_keys($noteAuthorIds) as $authorId) {
//            $noteAuthorNames[$authorId] = $db->userManager->getUserInfoByUserId($authorId)['fullname'];
//        }
//        $userDirectory = new ApUserDirectory($db->userManager);
//        $formatter = new WitnessPageFormatter($userDirectory);
//        //$html = $formatter->formatItemStream($itemStream, $edNotes);
//        $html = $formatter->formatItemStream($itemStream);
//        $doc['formatted'] = $html;
//
//        return $doc;
//    }
    
    /**
     * Returns the page span of the given location
     * @param array  $segLocation
     * @return int
     */
//    protected function pageSpan($segLocation) : int {
//        return $segLocation['end']['page_seq'] - $segLocation['start']['page_seq'] + 1;
//    }
    
//    protected function prettyPrintAddressInItemStream(Point $address) : string {
//
//        return $this->prettyPrintPoint($address);
//    }
    
//     protected  function prettyPrintTokens($tokens, $nonTokenItems) {
//        $types[TokenType::WORD] = 'W';
//        $types[TokenType::WHITESPACE] = 'S';
//        $types[TokenType::PUNCTUATION] = 'P';
//        $types[TokenType::EMPTY] = 'E';
//        //$types[TokenType::] = 'U';
//        $output = '';
//        foreach($tokens as $i => $token) {
//            /* @var  $token TranscriptionToken */
//            $addresses = [];
//            foreach($token->getSourceItemAddresses() as $address) {
//                $addresses[] = $this->prettyPrintAddressInItemStream($address->getFullAddress());
//            }
//            $lineRange = $token->getTextBoxLineRange();
//
//            $output .= $i . ' : (' . $types[$token->getType()] . ') ' .
//                    '[ ' . implode(' - ' , $addresses) . ' ] ' .
//                    $this->prettyPrintLineRange($lineRange) . ' ' .
//                    '\'' . $token->getText() . '\'';
//
//            if ($nonTokenItems[$i]['pre'] !== []) {
//                // @codeCoverageIgnoreStart
//                $output .= '   PRE: ';
//                foreach($nonTokenItems[$i]['pre'] as $index) {
//                    $output .=  'Item_' . $index . ' ';
//                }
//                // @codeCoverageIgnoreEnd
//            }
//            if ($nonTokenItems[$i]['post'] !== []) {
//                $output .= '   POST: ';
//                foreach($nonTokenItems[$i]['post'] as $index) {
//                    $output .=  'Item_' . $index . ' ';
//                }
//            }
//
//            $output .= "\n";
//        }
//        return $output;
//    }
//
//    protected function prettyPrintLineRange(PointRange $lineRange) {
//        $start = $lineRange->getStart();
//        $end = $lineRange->getEnd();
//
//        return $this->prettyPrintPoint($start) . ' -> ' . $this->prettyPrintPoint($end);
//    }
//
//    protected function prettyPrintPoint(Point $point) {
//        $dim = $point->getDimensionCount();
//        $data = [];
//        for ($i=0; $i< $dim; $i++) {
//            $data[] = $point->getCoord($i);
//        }
//        return implode(':', $data);
//    }
   
}