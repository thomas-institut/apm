<?php
/*
 * Copyright (C) 2016-18 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

/**
 * @brief Site Controller class
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */


namespace AverroesProjectToApm\Site;

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
    
    public function singleChunkPage(Request $request, Response $response, $next) 
    {
       
        $db = $this->db;
        $workId = $request->getAttribute('work');
        $chunkNumber = $request->getAttribute('chunk');
        $profiler = new ApmProfiler("chunkPage-$workId-$chunkNumber", $db);
        $workInfo = $db->getWorkInfo($workId);
        $witnessList = $db->getDocsForChunk($workId, $chunkNumber);

        $docs = [];
        $witnessNumber = 0;
        $goodWitnessesPerLang = [];
        foreach($this->ci->settings['languages'] as $lang) {
            $goodWitnessesPerLang[$lang['code']]['numWitnesses'] = 0;
            $goodWitnessesPerLang[$lang['code']]['name'] = $lang['name'];
            $goodWitnessesPerLang[$lang['code']]['code'] = $lang['code'];
        }
        
        foreach ($witnessList as $witness) {
            $doc = $this->buildWitnessDataFromDocData($witness, $workId, $chunkNumber, $db, ++$witnessNumber);
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
            if ($witnessLangInfo['numWitnesses'] >= 2) {
                $validCollationLangs[] = $goodWitnessesPerLang[$lang];
            }
        }
        
        $canViewWitnessDetails = false;
        if ($db->um->isUserAllowedTo($this->ci->userInfo['id'], 'witness-view-details')) {
            $canViewWitnessDetails = true;
        }
        
        $profiler->log($this->ci->logger);
        return $this->ci->view->render($response, 'ap2apm/chunkpage.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
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
        
        $db = $this->db;
        $workId = $request->getAttribute('work');
        $chunkNumber = $request->getAttribute('chunk');
        $type = $request->getAttribute('type');
        //$profiler = new ApmProfiler("WitnessPage-$workId-$chunkNumber", $db);
        $workInfo = $db->getWorkInfo($workId);

        // Assume, for the time being, that type==='doc'
        
        $witnessId = $request->getAttribute('id');
        $docData = $db->getDocById($witnessId);
        
        $doc = $this->buildWitnessDataFromDocData($docData, $workId, $chunkNumber, $db, 1);
        if ($doc['goodWitness']) {
            $doc['itemStreamDump'] =  print_r($doc['itemStream'], true);
            
            $doc['tokenDump'] = $this->prettyPrintTokens($doc['tokens']);
            ob_start();
                var_dump($doc['segmentApItemStreams']);
                $doc['segmentsDataDump'] = ob_get_contents();
            ob_end_clean();
            
            $doc['segmentsJSON'] = json_encode($doc['segmentApItemStreams'] );
        }

        return $this->ci->view->render($response, 'ap2apm/witness.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'work' => $workId,
            'chunk' => $chunkNumber,
            'type' => $type,
            'witnessid' => $witnessId,
            'work_info' => $workInfo,
            'doc' => $doc
        ]);
    }
    
   


    protected function buildWitnessDataFromDocData(array $docData, $workId, $chunkNumber, $db, $witnessNumber) : array  {
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
            // Can't reproduce this in testing, it's actually a very unlike error!
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
        $itemIds = [];

        foreach($locations as $segLocation ) {
            if (!$segLocation['valid']) {
                foreach($segLocation['warnings'] as $w) {
                    $doc['warnings'][] = $w;
                }
                $doc['goodWitness'] = false;
                continue;
            }
            $apItemStream = $db->getItemStreamBetweenLocations((int) $doc['id'], $segLocation['start'], $segLocation['end']);

            foreach($apItemStream as $row) {
                $itemIds[] = (int) $row['id'];
            }
            $doc['segmentApItemStreams'][] = $apItemStream;
            $doc['plain_text'] .= ItemStream::getPlainText($apItemStream) . ' '; // CHECK: Space in between? 
        }
        
        $this->ci->logger->debug('Doc ' . $docData['id'] . ' segment count: ' . count($doc['segmentApItemStreams']));
        $itemStream = new \AverroesProjectToApm\ItemStream($doc['id'], $doc['segmentApItemStreams'], $doc['lang']);
        $itemStrWitness = new \AverroesProjectToApm\ItemStreamWitness($workId, $chunkNumber, $itemStream);
        $doc['tokens'] = $itemStrWitness->getTokens();
        $this->ci->logger->debug('Doc ' . $docData['id'] . ' token Count: ' . count($doc['tokens']));

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
        $formatter = new \AverroesProjectToApm\Formatter\WitnessPageFormatter($noteAuthorNames);
        $html = $formatter->formatItemStream($itemStream, $edNotes);
        $doc['formatted'] = $html;
        
        return $doc;
    }
    
    
    protected function prettyPrintAddressInItemStream(\APM\Core\Address\Point $address) : string{
        
        return $this->prettyPrintPoint($address);
    }
    
     protected  function prettyPrintTokens($tokens) {
        $types[\APM\Core\Token\Token::TOKEN_WORD] = 'W';
        $types[\APM\Core\Token\Token::TOKEN_WS] = 'S';
        $types[\APM\Core\Token\Token::TOKEN_PUNCT] = 'P';
        $types[\APM\Core\Token\Token::TOKEN_EMPTY] = 'E';
        $types[\APM\Core\Token\Token::TOKEN_UNDEFINED] = 'U';
        $output = '';
        $tokenNumber = 1;
        foreach($tokens as $token) {
            /* @var  $token \APM\Core\Token\TranscriptionToken */
            $addresses = [];
            foreach($token->getSourceItemAddresses() as $address) {
                $addresses[] = $this->prettyPrintAddressInItemStream($address->getFullAddress());
            }
            $lineRange = $token->getTextBoxLineRange();

            $output .= $tokenNumber++ . ' : (' . $types[$token->getType()] . ') ' . 
                    '[ ' . implode(' - ' , $addresses) . ' ] ' . 
                    $this->prettyPrintLineRange($lineRange) . ' ' .
                    '\'' . $token->getText() . "'\n";
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
