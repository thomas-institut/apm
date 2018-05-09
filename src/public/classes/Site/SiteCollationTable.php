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
use AverroesProject\ItemStream\ItemStream;
use AverroesProject\Profiler\ApmProfiler;

/**
 * Site Controller class
 *
 */
class SiteCollationTable extends SiteController
{
    public function collationTablePage(Request $request, Response $response, $args) 
    {
        $db = $this->db;
        $workId = $request->getAttribute('work');
        $chunkNumber = $request->getAttribute('chunk');
        $language = $request->getAttribute('lang');
        $profiler = new ApmProfiler("CollationTable-$workId-$chunkNumber-$language", $db);
        $workInfo = $db->getWorkInfo($workId);
        $witnessList = $db->getDocsForChunk($workId, $chunkNumber);
        
        $docsToInclude = [];
        $partialCollation = false;
        if (isset($args['docs'])) {
            $docsInArgs = explode('/', $args['docs']);
            foreach ($docsInArgs as $docId) {
                $docId = intval($docId);
                if ($docId !== 0) {
                    $docsToInclude[] = $docId;
                }
            }
            $partialCollation = true;
            $this->ci->logger->debug('Partial collation', $docsToInclude);
            if (count($docsToInclude) < 2) {
                $msg = 'Error in partial collation table request: need at least 2 witnesses to collate, got only ' . count($docsToInclude) . '.';
                return $this->ci->view->render($response, 'chunk.collation.error.twig', [
                    'userinfo' => $this->ci->userInfo, 
                    'copyright' => $this->ci->copyrightNotice,
                    'baseurl' => $this->ci->settings['baseurl'],
                    'work' => $workId,
                    'chunk' => $chunkNumber,
                    'langName' => $language,
                    'isPartial' => $partialCollation,
                    'message' => $msg
                ]);
            }
            
        }
        
        $languages = $this->ci->settings['languages'];
        $langInfo = null;
        foreach($languages as $lang) {
            if ($lang['code'] === $language) {
                $langInfo = $lang;
            }
        }
        
        if (is_null($langInfo)) {
            $msg = 'Invalid language <b>' . $language . '</b>';
            return $this->ci->view->render($response, 'chunk.collation.error.twig', [
                'userinfo' => $this->ci->userInfo, 
                'copyright' => $this->ci->copyrightNotice,
                'baseurl' => $this->ci->settings['baseurl'],
                'work' => $workId,
                'chunk' => $chunkNumber,
                'lang' => $language,
                'isPartial' => $partialCollation,
                'message' => $msg
            ]);
        }
        
        $docs = [];
        $witnessNumber = 0;
        $totalNumDocs = 0;
        foreach ($witnessList as $witness) {
            if ($partialCollation) {
                if (!in_array(intval($witness['id']), $docsToInclude)) {
                    if ($witness['lang'] === $language) {
                        $totalNumDocs++;
                    }
                    continue;
                }
            }
            $doc = $witness;
            $docInfo = $db->getDocById($witness['id']);
            if ($docInfo['lang'] !== $language) {
                // not the right language
                continue;
            }
            
            $doc['number'] = ++$witnessNumber;
            $doc['errors'] = [];
            $doc['warning'] = '';
            $locations = $db->getChunkLocationsForDoc($witness['id'], $workId, $chunkNumber);
            if (count($locations)===0) {
                // No data for this witness, normally this should not happen
                continue;
            }
            //$this->ci->logger->debug('Chunk loc for ' . $workId . ' ' . $chunkNumber, $locations);
            $doc['start']['seq'] = $locations[0]['page_seq'];
            $doc['start']['foliation'] = is_null($locations[0]['foliation']) ? $locations[0]['page_seq'] : $locations[0]['foliation'];
            if (count($locations)===1) {
                // no chunk end
                continue;
            }
            $doc['end']['seq'] = $locations[1]['page_seq'];
            $doc['end']['foliation'] = is_null($locations[1]['foliation']) ? $locations[1]['page_seq'] : $locations[1]['foliation'];
            if ($locations[0]['type'] === 'end') {
                // chunk marks in reverse order
                continue;
            }
           
            $doc['itemStream'] = $db->getItemStreamBetweenLocations((int) $doc['id'], $locations[0], $locations[1]);
            $doc['items'] = ItemStream::createItemArrayFromItemStream($doc['itemStream']);
            //$doc['plain_text'] = ItemStream::getPlainText($doc['itemStream']);
            $doc['tokens'] = \AverroesProject\Collation\Tokenizer::tokenize($doc['items']);
            $docs[] = $doc;
            $totalNumDocs++;
        }
        
        if (count($docs) < 2) {
            $msg = count($docs) . ' witness(es) found for ' . $langInfo['name'] . ', need at least 2 to collate.'; 
            if ($partialCollation) {
                $msg .= '<br/> It could be that the partial collation table request has wrong document ids.';
            }
            return $this->ci->view->render($response, 'chunk.collation.error.twig', [
                'userinfo' => $this->ci->userInfo, 
                'copyright' => $this->ci->copyrightNotice,
                'baseurl' => $this->ci->settings['baseurl'],
                'work' => $workId,
                'chunk' => $chunkNumber,
                'lang' => $language,
                'langName' => $langInfo['name'],
                'isPartial' => $partialCollation,
                'message' => $msg
            ]);
        }
        
        $collatexWitnessArray  = [];
        foreach($docs as $theDoc) {
            $collatexWitnessArray[] = [
                'id' => $theDoc['title'],
                'tokens' => $theDoc['tokens']
                ];
        }
        
        $cr = $this->ci->cr;
        $profiler->lap('Pre-Collatex');
        $output = $cr->run($collatexWitnessArray);
        
        if ($output === false) {
            $this->ci->logger->error("Collation Error: error running Collatex",
                    [ 'data' => $collatexWitnessArray, 
                      'collatexRunnerError' => $cr->error, 
                      'rawOutput' => $cr->rawOutput ]);
            $msg = "Error running Collatex, please report it";
            return $this->ci->view->render($response, 'chunk.collation.error.twig', [
                'userinfo' => $this->ci->userInfo, 
                'copyright' => $this->ci->copyrightNotice,
                'baseurl' => $this->ci->settings['baseurl'],
                'work' => $workId,
                'chunk' => $chunkNumber,
                'lang' => $language,
                'langName' => $langInfo['name'],
                'isPartial' => $partialCollation,
                'message' => $msg
            ]);
        }
        
        $profiler->log($this->ci->logger);
        return $this->ci->view->render($response, 'chunk.collation.twig', [
                'userinfo' => $this->ci->userInfo, 
                'copyright' => $this->ci->copyrightNotice,
                'baseurl' => $this->ci->settings['baseurl'],
                'work' => $workId,
                'chunk' => $chunkNumber,
                'lang' => $language,
                'langName' => $langInfo['name'],
                'isPartial' => $partialCollation,
                'rtl' => $langInfo['rtl'],
                'work_info' => $workInfo,
                'docs' => $docs,
                'num_docs' => count($docs),
                'total_num_docs' => $totalNumDocs,
                'collatexOutput' => $output
            ]);
        
        
    }
    
    public function quickCollationPage(Request $request, Response $response, $next)
    {
        return $this->ci->view->render($response, 'collation.quick.twig', [
            'userinfo' => $this->ci->userInfo, 
            'copyright' => $this->ci->copyrightNotice,
            'baseurl' => $this->ci->settings['baseurl'],
        ]);
    }
}
