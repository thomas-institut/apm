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
            $doc['goodWitness'] = false;
            $locations = $db->getChunkLocationsForDoc($witness['id'], $workId, $chunkNumber);
            if (count($locations)===0) {
                $doc['errors'][] =  'Error in chunk info, did somebody just erased the chunks in this document? Please refresh';
                $doc['plain_text'] = '';
                $docs[] = $doc;
                continue;
            }
            $this->ci->logger->debug('Chunk loc for ' . $workId . ' ' . $chunkNumber, $locations);
            $doc['start']['seq'] = $locations[0]['page_seq'];
            $doc['start']['foliation'] = is_null($locations[0]['foliation']) ? $locations[0]['page_seq'] : $locations[0]['foliation'];
            if (count($locations)===1) {
                $doc['end']['seq'] = $locations[0]['page_seq'];
                $doc['end']['foliation'] = '?';
                $doc['plain_text'] = '';
                $doc['warnings'][] = 'No chunk end found';
                $docs[] = $doc;
                continue;
            }
            $doc['end']['seq'] = $locations[1]['page_seq'];
            $doc['end']['foliation'] = is_null($locations[1]['foliation']) ? $locations[1]['page_seq'] : $locations[1]['foliation'];
            if ($locations[0]['type'] === 'end') {
                $doc['warnings'][] = 'Chunk marks in reverse order';
                $docs[] = $doc;
                continue;
            }
            $profiler->lap('Doc '. $doc['id'] . ' locations');
            $itemStream = $db->getItemStreamBetweenLocations((int) $doc['id'], $locations[0], $locations[1]);
            $doc['plain_text'] = ItemStream::getPlainText($itemStream);
            if (count($doc['warnings']) === 0 || count($doc['errors']) === 0) {
                $doc['goodWitness'] = true;
            }
            $docs[] = $doc;
            $goodWitnessesPerLang[$doc['lang']]['numWitnesses']++;
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
