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
            $doc = $witness;
            $doc['number'] = ++$witnessNumber;
            $doc['errors'] = [];
            $doc['warnings'] = [];
            $doc['goodWitness'] = true;
            $doc['plain_text'] = '';
            $doc['segmentApItemStreams'] = [];
            $locations = $db->getChunkLocationsForDoc($witness['id'], $workId, $chunkNumber);
            if (count($locations)===0) {
                // @codeCoverageIgnoreStart
                // Can't reproduce this in testing, it's actually a very unlike error!
                // It will only happen if in the time between getting the list of documents
                // for the given chunk and actually getting the chunk location for one
                // of those documents, somebody changes the document and erases the chunk marks
                $doc['errors'][] =  'Error in chunk info, did somebody just erased the chunks in this document? Please refresh';
                $doc['plain_text'] = '';
                $doc['goodWitness'] = false;
                $docs[] = $doc;
                continue;
                // @codeCoverageIgnoreEnd
            }
            $this->ci->logger->debug('Chunk loc for ' . $workId . ' ' . $chunkNumber, $locations);
            
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

            $itemStream = new \AverroesProjectToApm\ItemStream($doc['id'], $doc['segmentApItemStreams'], $doc['lang']);
            $edNotes = $db->enm->getEditorialNotesForListOfItems($itemIds);
            $noteAuthorIds = [];
            foreach($edNotes as $edNote) {
                $noteAuthorIds[$edNote->authorId] = 1;
            }
            $noteAuthorNames=[];
            foreach(array_keys($noteAuthorIds) as $authorId) {
                $noteAuthorNames[$authorId] = $db->um->getUserInfoByUserId($authorId)['fullname'];
            }
            // TODO: get note author names
            $html = '';
            $formatter = new \AverroesProjectToApm\Formatter\WitnessPageFormatter($noteAuthorNames);
            $html = $formatter->formatItemStream($itemStream, $edNotes);
            $doc['formatted'] = $html;
            
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
            'collationLangs' => $validCollationLangs
        ]);
    }
   
}
