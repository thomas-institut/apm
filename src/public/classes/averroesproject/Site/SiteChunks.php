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


namespace AverroesProject\Site;

use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use AverroesProject\Profiler\ApmProfiler;

use AverroesProject\ItemStream\ItemStream;

/**
 * Site Controller class
 *
 */
class SiteChunks extends SiteController
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
            $locations = $db->getChunkLocationsForDoc($witness['id'], $workId, $chunkNumber);
            if (count($locations)===0) {
                $doc['errors'][] =  'Error in chunk info, did somebody just erased the chunks in this document? Please refresh';
                $doc['plain_text'] = '';
                $doc['goodWitness'] = false;
                $docs[] = $doc;
                continue;
            }
            $this->ci->logger->debug('Chunk loc for ' . $workId . ' ' . $chunkNumber, $locations);
            
            $doc['segments'] = $locations;
            
            foreach($locations as $segLocation ) {
                if (!$segLocation['valid']) {
                    foreach($segLocation['warnings'] as $w) {
                        $doc['warnings'][] = $w;
                    }
                    $doc['goodWitness'] = false;
                    continue;
                }
                $itemStream = $db->getItemStreamBetweenLocations((int) $doc['id'], $segLocation['start'], $segLocation['end']);
                $doc['plain_text'] .= ItemStream::getPlainText($itemStream) . ' '; // CHECK: Space in between? 
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
            if ($witnessLangInfo['numWitnesses'] >= 2) {
                $validCollationLangs[] = $goodWitnessesPerLang[$lang];
            }
        }
        
        $profiler->log($this->ci->logger);
        return $this->ci->view->render($response, 'chunk.show.twig', [
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
    
   
    public function chunksPage(Request $request, Response $response, $next) 
    {
       
        $db = $this->db;
        $profiler = new ApmProfiler('chunksPage', $db);

        $workIds = $db->getWorksWithTranscriptions();
        
        $works = [];
        foreach($workIds as $workId) {
            $work = ['work_id' => $workId, 'is_valid' => true];
            $workInfo = $db->getWorkInfo($workId);
            if ($workInfo === false) {
                $work['is_valid'] = false;
                $works[] = $work;
                continue;
            }
            $work['work_info'] = $workInfo;
            $chunks = $db->getChunksWithTranscriptionForWorkId($workId);
            $work['chunks'] = $chunks;
            $works[] = $work;
        }
        
        $profiler->log($this->ci->logger);
        return $this->ci->view->render($response, 'chunks.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
            'works' => $works
        ]);
    }
    
   
}
