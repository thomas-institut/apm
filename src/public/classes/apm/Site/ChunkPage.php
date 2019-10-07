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

/**
 * @brief Site Controller class
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */


namespace APM\Site;

use AverroesProject\Data\DataManager;
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use AverroesProject\Profiler\ApmProfiler;

use AverroesProject\ItemStream\ItemStream;

/**
 * Site Controller class
 *
 */
class ChunkPage extends SiteController
{
    
    /**
     * After this many pages in a witness, the witness is not rendered in 
     * the single chunk page. It will be asked separately via javascript
     */
    const PAGE_SPAN_THRESHHOLD = 3;
    
    public function singleChunkPage(Request $request, Response $response, $next) 
    {
       
        $dm = $this->dataManager;
        $workId = $request->getAttribute('work');
        $chunkNumber = $request->getAttribute('chunk');
        $profiler = new ApmProfiler("chunkPage-$workId-$chunkNumber", $dm);
        $workInfo = $dm->getWorkInfo($workId);
        $witnessList = $dm->getDocsForChunk($workId, $chunkNumber);

        $docs = [];
        $witnessNumber = 0;
        $goodWitnessesPerLang = [];
        foreach($this->config['languages'] as $lang) {
            $goodWitnessesPerLang[$lang['code']]['numWitnesses'] = 0;
            $goodWitnessesPerLang[$lang['code']]['name'] = $lang['name'];
            $goodWitnessesPerLang[$lang['code']]['code'] = $lang['code'];
        }
        
        foreach ($witnessList as $witness) {
            try {
                $doc = $this->buildEssentialWitnessDataFromDocData($witness, $workId, $chunkNumber, $dm, ++$witnessNumber);
                $doc['id'] = intval($doc['id']); // make sure Id is an integer
                $doc['delayLoad'] = true;
                if ($doc['pageSpan'] <= self::PAGE_SPAN_THRESHHOLD) {
                    $doc = $this->buildWitnessDataFromDocData($doc, $workId, $chunkNumber, $dm, $witnessNumber);
                    $doc['delayLoad'] = false;
                }
            } catch (\Exception $e) { // @codeCoverageIgnore
                $this->logger->error('Error in build Witness Data', $e->getMessage()); // @codeCoverageIgnore
            }
            
            if ($doc['goodWitness']) {
                $goodWitnessesPerLang[$doc['lang']]['numWitnesses']++;
            } else {
                $doc['plain_text'] = '';
            }
            $docs[] = $doc;
            $profiler->lap('Doc '. $doc['id'] . ' END');
        }
        
        $validCollationLangs = [];
        foreach ($goodWitnessesPerLang as $lang => $witnessLangInfo) {
            //if ($witnessLangInfo['numWitnesses'] >= 2) {
                $validCollationLangs[] = $goodWitnessesPerLang[$lang];
            //}
        }
        
        $canViewWitnessDetails = false;
        if ($dm->um->isUserAllowedTo($this->userInfo['id'], 'witness-view-details')) {
            $canViewWitnessDetails = true;
        }
        
        $profiler->log($this->logger);
        return $this->renderPage($response, 'chunkpage.twig', [
            'work' => $workId,
            'chunk' => $chunkNumber,
            'work_info' => $workInfo,
            'docs' => $docs,
            'num_docs' => count($docs),
            'collationLangs' => $validCollationLangs,
            'userCanViewChunkDetails' => $canViewWitnessDetails
        ]);
    }
    
    
    public function witnessPage(Request $request, Response $response, $next){
        
        $dm = $this->dataManager;
        $workId = $request->getAttribute('work');
        $chunkNumber = $request->getAttribute('chunk');
        $type = $request->getAttribute('type');
        $profiler = new ApmProfiler("WitnessPage-$workId-$chunkNumber", $this->dataManager);
        $workInfo = $dm->getWorkInfo($workId);
        
        $witnessId = $request->getAttribute('id');
        // Assume, for the time being, that type==='doc'
        $docData = $dm->getDocById($witnessId);
        
        $outputType = $request->getAttribute('output', 'full');
        $this->logger->debug('Witness page with output type: ' . $outputType);
        
        $essentialDocData = $this->buildEssentialWitnessDataFromDocData($docData, $workId, $chunkNumber, $dm, 1);
        if (!$essentialDocData['goodWitness']) {
             return $response->write("Bad witness");
        }
        $doc = $this->buildWitnessDataFromDocData($essentialDocData, $workId, $chunkNumber, $dm, 1);
        
        if ($doc['goodWitness'] && $outputType === 'full') {
            $doc['itemStreamDump'] =  print_r($doc['itemStream'], true);
            $doc['segmentsDump'] = print_r($doc['segments'], true);
            $nonTokenItems = $doc['itemStreamWitness']->getNonTokenItemIndexes();
            //$doc['nonTokenItems'] = print_r($nonTokenItems, true);
            $doc['tokenDump'] = $this->prettyPrintTokens($doc['tokens'], $nonTokenItems);
            
//            ob_start();
//                var_dump($doc['tokens']);
//                $doc['tokenDump2'] = ob_get_contents();
//            ob_end_clean();
            
            ob_start();
                var_dump($doc['segmentApItemStreams']);
                $doc['segmentsDataDump'] = ob_get_contents();
            ob_end_clean();
            
            $doc['segmentsJSON'] = json_encode($doc['segmentApItemStreams'] );
            $profiler->log($this->logger);
            return $this->renderPage($response, 'witness.twig', [
                'work' => $workId,
                'chunk' => $chunkNumber,
                'type' => $type,
                'witnessid' => $witnessId,
                'work_info' => $workInfo,
                'doc' => $doc
            ]);
        }
        
        if ($outputType === 'text') {
            return $response->write($doc['plain_text']);
        }
        
        if ($outputType === 'html') {
            return $response->write($doc['formatted']);
        }
        
        return $response->withStatus(402)->write('ERROR: unrecognized output option');
    }
    
    protected function buildEssentialWitnessDataFromDocData(array $docData, $workId, $chunkNumber, DataManager $db, $witnessNumber) : array  {
        $doc = $docData;
        $doc['number'] = $witnessNumber;
        $doc['errors'] = [];
        $doc['warnings'] = [];
        $doc['goodWitness'] = true;
        $doc['plain_text'] = '';
        $doc['segmentApItemStreams'] = [];
        $locations = $db->getChunkLocationsForDoc($docData['id'], $workId, $chunkNumber);
        if (count($locations)===0) {
            // @codeCoverageIgnoreStart
            // Can't reproduce this in testing, it's actually a very unlikely error!
            // It will only happen if in the time between getting the list of documents
            // for the given chunk and actually getting the chunk location for one
            // of those documents, somebody changes the document and erases the chunk marks
            $doc['errors'][] =  'Error in chunk info, did somebody just erased the chunks in this document? Please refresh';
            $doc['plain_text'] = '';
            $doc['goodWitness'] = false;
            return $doc;
            // @codeCoverageIgnoreEnd
        }
        $doc['segments'] = $locations;

        $doc['pageSpan'] = 0;
        $lastTime = '0000-00-00 00:00:00.000000';
        $lastAuthorId = 0;
        $lastAuthorName = '';
        $lastAuthorUsername = '';
        foreach($locations as $segLocation ) {
            if (!$segLocation['valid']) {
                foreach($segLocation['warnings'] as $w) {
                    $doc['warnings'][] = $w;
                }
                $doc['goodWitness'] = false;
                continue;
            }
            $doc['pageSpan'] += $this->pageSpan($segLocation);
            if (strcmp($lastTime, $segLocation['lastTime']) < 0) {
                $lastTime = $segLocation['lastTime'];
                $lastAuthorName = $segLocation['lastAuthorName'];
                $lastAuthorId = $segLocation['lastAuthorId'];
                $lastAuthorUsername = $segLocation['lastAuthorUsername'];
            }
        }
        $doc['lastTime'] = $lastTime;
        $doc['lastTimeFormatted'] = explode('.', $lastTime)[0];
        $doc['lastAuthorName'] = $lastAuthorName;
        $doc['lastAuthorId'] = $lastAuthorId;
        $doc['lastAuthorUsername'] = $lastAuthorUsername;
        return $doc;
    }


    protected function buildWitnessDataFromDocData(array $docData, $workId, $chunkNumber, $db, $witnessNumber) : array  {
        $doc = $docData;
        $locations = $doc['segments'];
        $itemIds = [];
        
        foreach($locations as $segLocation ) {
            if ($segLocation['valid']) {
                $apItemStream = $db->getItemStreamBetweenLocations((int) $doc['id'], $segLocation['start'], $segLocation['end']);
                foreach($apItemStream as $row) {
                    $itemIds[] = (int) $row['id'];
                }
                $doc['segmentApItemStreams'][] = $apItemStream;
                $doc['plain_text'] .= ItemStream::getPlainText($apItemStream) . ' ';
            }
        }
        
        //$this->logger->debug('Doc ' . $docData['id'] . ' segment count: ' . count($doc['segmentApItemStreams']));
        $edNoteArrayFromDb = $db->enm->rawGetEditorialNotesForListOfItems($itemIds);
        //$this->logger->debug('Ednotes', $edNoteArrayFromDb);
        $itemStream = new \AverroesProjectToApm\ItemStream($doc['id'], $doc['segmentApItemStreams'], $doc['lang'], $edNoteArrayFromDb);
        $itemStreamWitness = new \AverroesProjectToApm\ItemStreamWitness($workId, $chunkNumber, $itemStream);
        $doc['itemStreamWitness'] = $itemStreamWitness;
        $doc['tokens'] = $itemStreamWitness->getTokens();
        //$this->logger->debug('Doc ' . $docData['id'] . ':: tokens: ' . count($doc['tokens']) . ', page span: ' . $docData['pageSpan']);

        $doc['itemStream'] = $itemStream;
        $edNotes = $db->enm->getEditorialNotesForListOfItems($itemIds);
        $noteAuthorIds = [];
        foreach($edNotes as $edNote) {
            $noteAuthorIds[$edNote->authorId] = 1;
        }
        $noteAuthorNames=[];
        foreach(array_keys($noteAuthorIds) as $authorId) {
            $noteAuthorNames[$authorId] = $db->um->getUserInfoByUserId($authorId)['fullname'];
        }
        $userDirectory = new \AverroesProjectToApm\ApUserDirectory($db->um);
        $formatter = new \AverroesProjectToApm\Formatter\WitnessPageFormatter($userDirectory);
        $html = $formatter->formatItemStream($itemStream, $edNotes);
        $doc['formatted'] = $html;
        
        return $doc;
    }
    
    /**
     * Returns the page span of the given location
     * @param array  $segLocation
     * @return int
     */
    protected function pageSpan($segLocation) : int {
        return $segLocation['end']['page_seq'] - $segLocation['start']['page_seq'] + 1;
    }
    
    protected function prettyPrintAddressInItemStream(\APM\Core\Address\Point $address) : string {
        
        return $this->prettyPrintPoint($address);
    }
    
     protected  function prettyPrintTokens($tokens, $nonTokenItems) {
        $types[\APM\Core\Token\Token::TOKEN_WORD] = 'W';
        $types[\APM\Core\Token\Token::TOKEN_WHITESPACE] = 'S';
        $types[\APM\Core\Token\Token::TOKEN_PUNCT] = 'P';
        $types[\APM\Core\Token\Token::TOKEN_EMPTY] = 'E';
        $types[\APM\Core\Token\Token::TOKEN_UNDEFINED] = 'U';
        $output = '';
        foreach($tokens as $i => $token) {
            /* @var  $token \APM\Core\Token\TranscriptionToken */
            $addresses = [];
            foreach($token->getSourceItemAddresses() as $address) {
                $addresses[] = $this->prettyPrintAddressInItemStream($address->getFullAddress());
            }
            $lineRange = $token->getTextBoxLineRange();

            $output .= $i . ' : (' . $types[$token->getType()] . ') ' . 
                    '[ ' . implode(' - ' , $addresses) . ' ] ' . 
                    $this->prettyPrintLineRange($lineRange) . ' ' .
                    '\'' . $token->getText() . '\'';
            
            if ($nonTokenItems[$i]['pre'] !== []) {
                // @codeCoverageIgnoreStart
                $output .= '   PRE: ';
                foreach($nonTokenItems[$i]['pre'] as $index) {
                    $output .=  'Item_' . $index . ' ';
                }
                // @codeCoverageIgnoreEnd
            }
            if ($nonTokenItems[$i]['post'] !== []) {
                $output .= '   POST: ';
                foreach($nonTokenItems[$i]['post'] as $index) {
                    $output .=  'Item_' . $index . ' ';
                }
            }
            
            $output .= "\n";
        }
        return $output;
    }
    
    protected function prettyPrintLineRange(\APM\Core\Address\PointRange $lineRange) {
        $start = $lineRange->getStart();
        $end = $lineRange->getEnd();
        
        return $this->prettyPrintPoint($start) . ' -> ' . $this->prettyPrintPoint($end);
    }
    
    protected function prettyPrintPoint(\APM\Core\Address\Point $point) {
        $dim = $point->getDimensionCount();
        $data = [];
        for ($i=0; $i< $dim; $i++) {
            $data[] = $point->getCoord($i);
        }
        return implode(':', $data);
    }
   
}
